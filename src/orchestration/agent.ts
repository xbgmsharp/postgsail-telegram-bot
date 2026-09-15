import { Mistral } from '@mistralai/mistralai';
import { GoogleGenAI } from '@google/genai';
import { CohereClientV2 } from 'cohere-ai';
import { MCPClient, MCPPrompt, MCPPromptMessage } from '../mcp/client';
import { Logger } from '../utils/logger';

const DOMAIN_KNOWLEDGE = `
## Term mapping (user says → tool parameter value)
- "anchored" / "at anchor"           → stay_type: "Anchor"
- "marina" / "pontoon" / "alongside" → stay_type: "Dock"
- "mooring" / "buoy"                 → stay_type: "Mooring Buoy"
- "last trip" / "last voyage"        → use get_last_log (no params needed)
- "nearby" / "close to" / "near X"  → use find_anchorages_near with resolved lat/lon

## Entity relationships
- stays.moorage_id links to moorages (use get_moorage(id) to get place details for a stay)
- moorages are auto-created by clustering stays within 300 m of each other
- a log (trip) has departure/arrival moorage references — use get_log(id) for full sensor data
`;

const logger = new Logger('OrchestrationAgent');

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const msg = (error as any).message ?? '';
  const status = (error as any).status ?? (error as any).statusCode ?? 0;
  return status === 429 || msg.includes('429') || msg.toLowerCase().includes('rate limit');
}

export class OrchestrationAgent {
  private mistral: Mistral;
  private genai: GoogleGenAI | null;
  private cohere: CohereClientV2 | null;
  private mcpClient: MCPClient;
  private sailorContext: any = null;
  private language: string;

  constructor(mistralApiKey: string, mcpUrl: string, userJwt: string, language: string = 'en', sailorContext: any = null) {
    this.mistral = new Mistral({ apiKey: mistralApiKey });
    this.genai = process.env.GEMINI_API_KEY
      ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      : null;
    this.cohere = process.env.COHERE_API_KEY
      ? new CohereClientV2({ token: process.env.COHERE_API_KEY })
      : null;
    this.mcpClient = new MCPClient(mcpUrl, userJwt);
    this.language = language;
    this.sailorContext = sailorContext;
    logger.info('OrchestrationAgent initialized', { language,
      genaiEnabled: !!this.genai,
      cohereEnabled: !!this.cohere,
      contextCached: !!sailorContext });
  }

  getSailorContext(): any {
    return this.sailorContext;
  }

  async processQuery(userQuery: string): Promise<string> {
    logger.info('Processing query', { query: userQuery });

    const [tools, prompts] = await Promise.all([
      this.mcpClient.listTools(),
      this.mcpClient.listPrompts().catch(() => [] as MCPPrompt[])
    ]);

    await this.ensureSailorContext();
    const promptMessages = await this.resolvePrompt(userQuery, prompts);

    // Mistral native tool calling — typically 1–2 LLM calls total
    try {
      return await this.runMistralLoop(userQuery, tools, promptMessages);
    } catch (error) {
      if (isRateLimitError(error) && this.genai) {
        logger.warn('Mistral rate limited, falling back to Gemini');
        return await this.runGeminiLoop(userQuery, tools, promptMessages);
      }
      logger.error('Query failed', error);
      return 'I was unable to process your query. Please try again.';
    }
  }

  // ---------------------------------------------------------------------------
  // Mistral native tool calling loop
  // ---------------------------------------------------------------------------

  private async runMistralLoop(
    userQuery: string,
    tools: any[],
    promptMessages: MCPPromptMessage[]
  ): Promise<string> {
    const mistralTools = tools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description ?? '',
        parameters: t.inputSchema ?? { type: 'object', properties: {} }
      }
    }));

    const messages = this.buildMistralMessages(userQuery, promptMessages);

    for (let round = 0; round < 4; round++) {
      logger.debug(`Mistral round ${round + 1}`);
      logger.debug('Mistral request payload', {
        tools: JSON.stringify(mistralTools, null, 2),
        messages: JSON.stringify(messages, null, 2)
      });

      const response = await this.mistral.chat.complete({
        model: 'mistral-small-latest',
        messages,
        tools: mistralTools,
        toolChoice: 'auto'
      });

      const msg = response.choices?.[0]?.message;
      if (!msg) break;

      messages.push(msg as any);

      const toolCalls: any[] = (msg as any).toolCalls ?? [];

      if (!toolCalls.length) {
        // No more tool calls — model has composed the final answer
        return typeof msg.content === 'string' ? msg.content : 'Unable to process query.';
      }

      logger.info(`Round ${round + 1}: executing ${toolCalls.length} tool(s) in parallel`, {
        tools: toolCalls.map((tc: any) => tc.function?.name)
      });

      // Execute all requested tool calls in parallel
      const toolResults = await Promise.all(
        toolCalls.map(async (tc: any) => {
          const name = tc.function?.name ?? '';
          let args: any = {};
          try {
            const raw = tc.function?.arguments;
            args = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {});
          } catch {}

          let content: string;
          try {
            const result = await this.mcpClient.callTool(name, args);
            content = JSON.stringify(this.extractToolResult(result));
            logger.debug('Tool ok', { tool: name });
          } catch (err) {
            content = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
            logger.error(`Tool ${name} failed`, err);
          }

          return { role: 'tool' as const, toolCallId: tc.id, content };
        })
      );

      messages.push(...toolResults);
    }

    return 'I was unable to gather enough information. Please try again.';
  }

  private buildMistralMessages(userQuery: string, promptMessages: MCPPromptMessage[]): any[] {
    const { lang, responseLang } = this.resolvedLang();
    const messages: any[] = [
      { role: 'system', content: this.buildSystemPrompt(lang, responseLang) }
    ];
    for (const pm of promptMessages) {
      const text = pm.content.type === 'text' ? (pm.content as any).text : JSON.stringify(pm.content);
      messages.push({ role: pm.role, content: text });
    }
    messages.push({ role: 'user', content: userQuery });
    return messages;
  }

  // ---------------------------------------------------------------------------
  // Gemini native function calling loop (rate-limit fallback)
  // ---------------------------------------------------------------------------

  private async runGeminiLoop(
    userQuery: string,
    tools: any[],
    promptMessages: MCPPromptMessage[]
  ): Promise<string> {
    const { lang, responseLang } = this.resolvedLang();

    const functionDeclarations = tools.map(t => ({
      name: t.name,
      description: t.description ?? '',
      parametersJsonSchema: t.inputSchema ?? { type: 'object', properties: {} }
    }));

    const contents: any[] = [];
    for (const pm of promptMessages) {
      const text = pm.content.type === 'text' ? (pm.content as any).text : JSON.stringify(pm.content);
      contents.push({ role: pm.role === 'assistant' ? 'model' : 'user', parts: [{ text }] });
    }
    contents.push({ role: 'user', parts: [{ text: userQuery }] });

    for (let round = 0; round < 4; round++) {
      logger.debug(`Gemini round ${round + 1}`);

      const result = await this.genai!.models.generateContent({
        model: 'gemini-2.0-flash',
        contents,
        config: {
          systemInstruction: this.buildSystemPrompt(lang, responseLang),
          temperature: 0.2,
          tools: [{ functionDeclarations }]
        }
      });

      const functionCalls: any[] = (result as any).functionCalls ?? [];

      if (!functionCalls.length) {
        return result.text ?? 'Unable to process query.';
      }

      // Add model turn to history
      const candidate = result.candidates?.[0];
      if (candidate?.content) {
        contents.push({ role: 'model', parts: candidate.content.parts ?? [] });
      }

      logger.info(`Gemini round ${round + 1}: executing ${functionCalls.length} tool(s) in parallel`, {
        tools: functionCalls.map((fc: any) => fc.name)
      });

      // Execute all function calls in parallel
      const functionResponses = await Promise.all(
        functionCalls.map(async (fc: any) => {
          const args = fc.args ?? {};
          let responseData: Record<string, unknown>;
          try {
            const toolResult = await this.mcpClient.callTool(fc.name, args);
            responseData = { output: JSON.stringify(this.extractToolResult(toolResult)) };
            logger.debug('Tool ok (Gemini)', { tool: fc.name });
          } catch (err) {
            responseData = { error: err instanceof Error ? err.message : String(err) };
            logger.error(`Tool ${fc.name} failed (Gemini)`, err);
          }

          return { functionResponse: { id: fc.id, name: fc.name, response: responseData } };
        })
      );

      contents.push({ role: 'user', parts: functionResponses });
    }

    return 'I was unable to gather enough information. Please try again.';
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private resolvedLang(): { lang: string; responseLang: string } {
    const langNames: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German' };
    const lang = this.sailorContext?.sailor?.language ?? this.language;
    return { lang, responseLang: langNames[lang] ?? 'English' };
  }

  private buildSystemPrompt(lang: string, responseLang: string): string {
    const ctx = {
      name: this.sailorContext?.sailor?.name,
      language: lang,
      units: this.sailorContext?.sailor?.units,
      vessel: this.sailorContext?.vessel?.name ?? this.sailorContext?.vessel?.mmsi,
      home_port: this.sailorContext?.sailor?.home_port ?? this.sailorContext?.vessel?.home_port
    };

    return `You are the PostgSail Assistant — a maritime vessel tracking system.
Use the available tools to look up the user's sailing data, then respond with a clear Telegram message.

Sailor context:
${JSON.stringify(ctx)}

${DOMAIN_KNOWLEDGE}

## Tool usage guidance
- "daily/system/vessel summary / how is my boat" → call get_monitoring_live, get_last_log, get_monitoring_history(time_interval:"24 hours") together
- "last trip / voyage / log" → get_last_log
- "trip details for trip X" → get_logs to find ID, then get_log(id)
- "where is my boat / current position" → get_monitoring_live
- "statistics / how far have I sailed" → get_stats with optional date range; call twice with different ranges to compare
- "find anchorages near [place]" → resolve lat/lon from your own knowledge, then find_anchorages_near
- "find anchorages near my last stop" → get_last_log for coordinates, then find_anchorages_near
- "moorage details / visits to moorage X" → get_moorages to find ID, then get_moorage(id) and get_moorage_stays(id)
- "all trips from/to [port]" → get_moorages to find moorage ID, then get_moorage_arrivals_departures(id)
- "my achievements / badges" → get_badges
- "sensor history / conditions over last N days" → get_monitoring_history(time_interval)
- "vessel info / boat specs" → get_vessel
- "what can you do / what data do you have" → get_user_context

## Response formatting
- Write entirely in ${responseLang}
- Use Telegram Markdown v1: *bold* labels, _italic_ emphasis, \`code\` for IDs/versions
- Maritime emojis: ⛵ 🚢 ⚓ 🧭 🌊 🗺️ 📍 ⏱️ 🌬️ 🔋 ☀️ 🏆
- Numbers with units: "12.5 nm", "3h 20min", "6.2 kts", "28°C"
- Convert ISO durations: PT2H30M → 2h 30min, P1DT4H → 1d 4h
- Dates: "Mon 19 May 2025" style; include time when relevant
- Coordinates: decimal degrees with 4 decimal places and N/S/E/W
- Bullet lists for multiple items; bold the key metric per line
- Omit null/missing fields — don't write "N/A"
- Mark personal records with 🏆
- Lead with the most important info; keep it mobile-friendly`;
  }

  private async resolvePrompt(userQuery: string, prompts: MCPPrompt[]): Promise<MCPPromptMessage[]> {
    if (prompts.length === 0) return [];

    const queryLower = userQuery.toLowerCase();
    const match = prompts.find(p => {
      const name = (p.name || '').toLowerCase();
      const desc = (p.description || '').toLowerCase();
      return queryLower.split(/\s+/).some(word => word.length > 3 && (name.includes(word) || desc.includes(word)));
    });

    if (!match) {
      logger.debug('No matching MCP prompt found');
      return [];
    }

    logger.info('Matched MCP prompt', { prompt: match.name });
    try {
      return await this.mcpClient.getPrompt(match.name);
    } catch (error) {
      logger.error('Failed to get MCP prompt', error);
      return [];
    }
  }

  private extractToolResult(result: any): any {
    if (!result) return result;

    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          try {
            return this.stripGeoJSONFeatures(JSON.parse(item.text));
          } catch {
            return item.text;
          }
        }
      }
    }

    return this.stripGeoJSONFeatures(result);
  }

  /**
   * Replaces GeoJSON FeatureCollection.features with an empty array + count hint
   * to avoid overflowing the LLM context window.
   */
  private stripGeoJSONFeatures(data: any): any {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map(item => this.stripGeoJSONFeatures(item));
    }

    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      const count = data.features.length;
      if (count > 0) logger.debug('Stripping GeoJSON features', { count });
      const { features: _dropped, ...rest } = data;
      return { ...rest, features: [], _features_count: count };
    }

    const out: any = {};
    for (const key of Object.keys(data)) {
      out[key] = this.stripGeoJSONFeatures(data[key]);
    }
    return out;
  }

  private async ensureSailorContext(): Promise<void> {
    if (this.sailorContext) return;
    try {
      const result = await this.mcpClient.callTool('get_user_context', {});
      this.sailorContext = this.extractToolResult(result);
      logger.debug('Sailor context loaded', { name: this.sailorContext?.sailor?.name });
    } catch (error) {
      logger.error('Failed to load sailor context', error);
      this.sailorContext = {};
    }
  }
}

import { Mistral } from '@mistralai/mistralai';
import { GoogleGenAI } from '@google/genai';
import { MCPClient, MCPPrompt, MCPPromptMessage } from '../mcp/client';
import { Logger } from '../utils/logger';

const DOMAIN_KNOWLEDGE = `
## PostgSail data model (use to interpret user queries and fill tool parameters)

**logbook** — one entry per trip. Contains: distance (NM), duration, max/avg speed (knots),
  departure and arrival place names, GPS track, sensor readings along route.
  Query with: get_logs, get_last_log, get_log(id), get_stats

**stays** — one entry per stationary period. Types: "Anchor", "Dock", "Mooring Buoy", "Unknown".
  Contains: arrived, departed, duration (hours), moorage_id.
  Query with: get_stays, get_stay(id)

**moorages** — named places, auto-created by clustering stays within 300m.
  Contains: name, GPS position, visit count, home_flag, stay_code.
  Query with: get_moorages, get_moorage(id), find_anchorages_near(lat, lon)

**monitoring** — live and historical sensor data.
  Available sensors: SOG, COG, heading, true wind speed/direction, depth, water temp,
  outside temp/pressure/humidity, inside temp/pressure/humidity, battery %, voltage,
  solar power/voltage, tank level.
  Query with: get_monitoring_live, get_monitoring_history

## Units (always use these when filling tool parameters)
- Distance: nautical miles (NM)
- Speed: knots
- Depth/radius: metres (convert: 1 NM = 1852 m)
- Temperature: °C
- Pressure: hPa

## Term mapping (user says → tool parameter value)
- "anchored" / "at anchor"           → stay_type: "Anchor"
- "marina" / "pontoon" / "alongside" → stay_type: "Dock"
- "mooring" / "buoy"                 → stay_type: "Mooring Buoy"
- "last trip" / "last voyage"        → use get_last_log (no params needed)
- "nearby" / "close to" / "near X"  → use find_anchorages_near with resolved lat/lon
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
  private mcpClient: MCPClient;

  private language: string;

  constructor(mistralApiKey: string, mcpUrl: string, userJwt: string, language: string = 'en') {
    this.mistral = new Mistral({ apiKey: mistralApiKey });
    this.genai = process.env.GEMINI_API_KEY
      ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      : null;
    this.mcpClient = new MCPClient(mcpUrl, userJwt);
    this.language = language;
    logger.info('OrchestrationAgent initialized', { language, genaiEnabled: !!this.genai });
  }

  async processQuery(userQuery: string): Promise<string> {
    logger.info('Processing query', { query: userQuery });

    const [tools, prompts] = await Promise.all([
      this.mcpClient.listTools(),
      this.mcpClient.listPrompts().catch(() => [] as MCPPrompt[])
    ]);

    const promptMessages = await this.resolvePrompt(userQuery, prompts);

    const history: any[] = [];

    // Track tool+args pairs so the same tool can be called with different arguments
    const usedToolCalls = new Set<string>();
    const toolCallKey = (tool: string, args: any) => `${tool}:${JSON.stringify(args ?? {})}`;

    // Orchestration loop — up to 8 steps to support multi-step reasoning
    for (let step = 0; step < 8; step++) {
      logger.debug(`Orchestration step ${step + 1}`);

      const decision = await this.chooseNextAction(
        userQuery,
        tools,
        history,
        usedToolCalls,
        promptMessages
      );

      logger.debug('Decision made', { decision });

      if (decision.type === 'final_answer') {
        logger.info('Final answer decision received, generating summary');

        if (history.length > 0) {
          return await this.summarizeAnswer(userQuery, history, promptMessages);
        }

        if (typeof decision.message === 'string' && decision.message !== 'done') {
          return decision.message;
        }

        if (typeof decision.message === 'object') {
          history.push({ tool: 'final_data', result: decision.message });
          return await this.summarizeAnswer(userQuery, history, promptMessages);
        }

        return 'I was unable to gather information about your vessel. Please try again.';
      }

      if (decision.type === 'ask_user') {
        logger.info('Asking user for clarification');
        return String(decision.message || 'Could you provide more information?');
      }

      if (decision.type === 'tool_call') {
        const key = toolCallKey(decision.tool, decision.arguments);

        if (usedToolCalls.has(key)) {
          logger.debug('Exact tool+args already used, skipping', { tool: decision.tool });
          history.push({
            tool: decision.tool,
            arguments: decision.arguments,
            error: 'Already called with these exact arguments — use different arguments or return final_answer'
          });
          continue;
        }

        try {
          logger.info('Executing tool', { tool: decision.tool, args: decision.arguments });
          const result = await this.mcpClient.callTool(
            decision.tool,
            decision.arguments || {}
          );

          const extractedResult = this.extractToolResult(result);

          history.push({
            tool: decision.tool,
            arguments: decision.arguments,
            result: extractedResult
          });

          usedToolCalls.add(key);
          logger.debug('Tool executed', { tool: decision.tool, resultPreview: JSON.stringify(extractedResult).substring(0, 200) });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Tool ${decision.tool} failed`, error);
          history.push({
            tool: decision.tool,
            arguments: decision.arguments,
            error: `Tool failed: ${errMsg}`
          });
          usedToolCalls.add(key);
        }
      }
    }

    logger.info('Generating summary from history after loop completion');

    if (history.length > 0) {
      const summary = await this.summarizeAnswer(userQuery, history, promptMessages);
      logger.debug('Summary generated', { summary: summary.substring(0, 200) });
      return summary;
    }

    return 'I was unable to gather information. Please try a different question.';
  }

  private async chooseNextAction(
    userQuery: string,
    tools: any[],
    history: any[],
    usedToolCalls: Set<string>,
    promptMessages: MCPPromptMessage[] = []
  ): Promise<any> {
    const langNames: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German' };
    const responseLang = langNames[this.language] ?? 'English';

    const systemPrompt = `You are the PostgSail Assistant — an AI for maritime voyage tracking and sailing analytics.

${DOMAIN_KNOWLEDGE}

## Your role
Decide the NEXT single action to answer the user's query. Before choosing a tool, reason through:
1. What does the user ultimately want?
2. What data is required? Is any required data missing?
3. Which tool fetches that data? Does it need an ID from a prior tool call?
4. Have I collected everything needed, or should I call another tool?

## Tool chaining patterns — follow these for complex queries
- "daily summary / system summary / vessel summary / how is my boat" →
    call ALL of: get_monitoring_live (current status), 
    get_last_log (most recent voyage), get_monitoring_history(time_interval:"24 hours") (sensor trends).
    Do NOT ask for clarification — gather all four then summarize.
- "my last trip / voyage / log" → call get_last_log
- "trip details for trip X" → call get_logs to find the ID, then get_log(id)
- "where is my boat / current position" → get_monitoring_live
- "what were conditions during voyage X" → get_log(id) for sensor data
- "statistics / how far have I sailed / sailing summary" → get_stats with optional date range
- "find anchorages near [place]" → resolve the place name to lat/lon from your knowledge, then find_anchorages_near
- "find anchorages near my last stop" → get_last_log to get destination coordinates, then find_anchorages_near
- "moorage details / visits to moorage X" → get_moorages to find ID, then get_moorage(id) and get_moorage_stays(id)
- "all trips from/to [port]" → get_moorages to find moorage ID, then get_moorage_arrivals_departures(id)
- "my achievements / badges" → get_badges
- "sensor history / conditions over last N days" → get_monitoring_history(time_interval)
- "vessel info / boat specs" → get_vessel
- "what can you do / what do you know about me / what sailing data is available" → get_initial_context
- Multi-step example: "compare this month to last month" → get_stats twice with different date ranges

## Key rules
- Return ONLY valid JSON, no markdown, no explanation
- Pass date ranges as ISO 8601 strings (e.g. "2025-01-01", "2025-12-31")
- The same tool MAY be called again with DIFFERENT arguments (e.g., get_stats for two date ranges)
- Only block calls with the exact same tool name AND exact same arguments as already used
- For geographical place names, resolve lat/lon from your own knowledge before calling find_anchorages_near
- Use get_initial_context when the user asks what you can do, what data you have about them, or when the query is broad and needs overall sailing context to answer well
- Return final_answer only when you have sufficient data to answer the query completely
- Only return ask_user if the query is genuinely ambiguous AND no tool can help without clarification — never ask when summary/status queries can be answered with available tools

Response format (exactly one of):
{"type": "tool_call", "tool": "<name>", "arguments": {<args>}}
{"type": "ask_user", "message": "<question in ${responseLang}>"}
{"type": "final_answer", "message": "done"}`;

    // Keep last 10 history entries to stay within context
    const recentHistory = history.slice(-10);

    const userPrompt = `Query: "${userQuery}"

Available tools:
${JSON.stringify(tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })), null, 2)}

Already called (tool:args):
${JSON.stringify([...usedToolCalls])}

Data collected so far:
${JSON.stringify(recentHistory, null, 2)}

What is the next action?`;

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    for (const pm of promptMessages) {
      const text = pm.content.type === 'text' ? (pm.content as any).text : JSON.stringify(pm.content);
      messages.push({ role: pm.role, content: text });
    }
    messages.push({ role: 'user', content: userPrompt });

    try {
      const response = await this.mistral.chat.complete({
        model: 'mistral-large-latest',
        temperature: 0.1,
        messages,
        responseFormat: { type: 'json_object' }
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        logger.error('Invalid response from Mistral', { content });
        return { type: 'final_answer', message: 'done' };
      }

      const decision = JSON.parse(content);
      logger.debug('Mistral decision', { decision });
      return decision;
    } catch (error) {
      if (isRateLimitError(error) && this.genai) {
        logger.warn('Mistral rate limited, falling back to Gemini for decision');
        return await this.chooseNextActionGemini(messages);
      }
      logger.error('Decision error', error);
      return { type: 'final_answer', message: 'done' };
    }
  }

  private async chooseNextActionGemini(messages: any[]): Promise<any> {
    try {
      const prompt = messages.map(m => `[${m.role}]: ${m.content}`).join('\n\n');
      const result = await this.genai!.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        logger.error('Gemini returned no text for decision');
        return { type: 'final_answer', message: 'done' };
      }
      const decision = JSON.parse(text);
      logger.debug('Gemini decision', { decision });
      return decision;
    } catch (error) {
      logger.error('Gemini decision error', error);
      return { type: 'final_answer', message: 'done' };
    }
  }

  private async summarizeAnswer(userQuery: string, history: any[], promptMessages: MCPPromptMessage[] = []): Promise<string> {
    const langNames: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German' };
    const responseLang = langNames[this.language] ?? 'English';

    const systemPrompt = `You are the PostgSail Assistant — a maritime voyage tracking AI. Compose a clear, helpful Telegram message that directly answers the user's question using the collected data.

## Formatting rules
- Write entirely in ${responseLang}
- Answer the user's specific question — do not default to a generic vessel summary
- Use Telegram Markdown: **bold** for labels, _italic_ for emphasis, \`code\` for IDs/versions
- Maritime emojis: ⛵ 🚢 ⚓ 🧭 🌊 🗺️ 📍 ⏱️ 🌬️ 🔋 ☀️ 🏆
- Numbers with units: "12.5 nm", "3h 20min", "6.2 kts", "28°C"
- Convert ISO durations: PT2H30M → 2h 30min, P1DT4H → 1d 4h
- Dates: "Mon 19 May 2025" style; include time when relevant
- Coordinates: show as decimal degrees with 4 decimal places and N/S/E/W
- Use bullet lists for multiple items; bold the key metric on each line
- If comparing periods, show both values side-by-side
- Omit fields that are null or missing — don't write "N/A"
- Mark personal records or achievements with 🏆
- For anchorage suggestions, include name, type, and distance if available
- Keep it mobile-friendly and scannable — lead with the most important info

Return ONLY the formatted message text, no JSON, no preamble.`;

    const historyText = JSON.stringify(history, null, 2);
    logger.debug('Summarizing with history', { historyLength: historyText.length });

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    for (const pm of promptMessages) {
      const text = pm.content.type === 'text' ? (pm.content as any).text : JSON.stringify(pm.content);
      messages.push({ role: pm.role, content: text });
    }
    messages.push({
      role: 'user',
      content: `User query: "${userQuery}"\n\nCollected data:\n${historyText}\n\nProvide a helpful, well-formatted answer:`
    });

    try {
      const response = await this.mistral.chat.complete({
        model: 'mistral-large-latest',
        temperature: 0.3,
        messages
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        logger.error('No content in Mistral response');
        return 'Sorry, I had trouble generating a summary.';
      }

      if (typeof content !== 'string') {
        logger.error('Content is not a string', { content, type: typeof content });
        return 'Sorry, I had trouble formatting the response.';
      }

      logger.debug('Summary created', { length: content.length });
      return content;
    } catch (error) {
      if (isRateLimitError(error) && this.genai) {
        logger.warn('Mistral rate limited, falling back to Gemini for summary');
        return await this.summarizeAnswerGemini(messages);
      }
      logger.error('Summary error', error);
      return 'Sorry, I had trouble summarizing the results.';
    }
  }

  private async summarizeAnswerGemini(messages: any[]): Promise<string> {
    try {
      const prompt = messages.map(m => `[${m.role}]: ${m.content}`).join('\n\n');
      const result = await this.genai!.models.generateContent({
        model: "gemini-flash-latest",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        logger.error('Gemini returned no text for summary');
        return 'Sorry, I had trouble summarizing the results.';
      }
      logger.debug('Gemini summary created', { length: text.length });
      return text;
    } catch (error) {
      logger.error('Gemini summary error', error);
      return 'Sorry, I had trouble summarizing the results.';
    }
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
    logger.debug('Extracting tool result', { resultType: typeof result });

    if (!result) return result;

    // MCP wraps results in content array
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text' && item.text) {
          try {
            const parsed = JSON.parse(item.text);
            logger.debug('Parsed text content', { parsed });
            return this.stripGeoJSONFeatures(parsed);
          } catch {
            logger.debug('Returning raw text content');
            return item.text;
          }
        }
      }
    }

    return this.stripGeoJSONFeatures(result);
  }

  /**
   * Recursively finds GeoJSON FeatureCollections and replaces their features array
   * with an empty array + a count hint, to avoid overflowing the LLM context window.
   */
  private stripGeoJSONFeatures(data: any): any {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map(item => this.stripGeoJSONFeatures(item));
    }

    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      const count = data.features.length;
      if (count > 0) {
        logger.debug('Stripping GeoJSON features', { count });
      }
      const { features: _dropped, ...rest } = data;
      return { ...rest, features: [], _features_count: count };
    }

    const out: any = {};
    for (const key of Object.keys(data)) {
      out[key] = this.stripGeoJSONFeatures(data[key]);
    }
    return out;
  }
}

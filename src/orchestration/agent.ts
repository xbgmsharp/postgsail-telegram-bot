import { Mistral } from '@mistralai/mistralai';
import { MCPClient, MCPPrompt, MCPPromptMessage } from '../mcp/client';
import { Logger } from '../utils/logger';

const logger = new Logger('OrchestrationAgent');

export class OrchestrationAgent {
  private mistral: Mistral;
  private mcpClient: MCPClient;

  private language: string;

  constructor(mistralApiKey: string, mcpUrl: string, userJwt: string, language: string = 'en') {
    this.mistral = new Mistral({ apiKey: mistralApiKey });
    this.mcpClient = new MCPClient(mcpUrl, userJwt);
    this.language = language;
    logger.info('OrchestrationAgent initialized', { language });
  }

  async processQuery(userQuery: string): Promise<string> {
    logger.info('Processing query', { query: userQuery });

    const [tools, prompts] = await Promise.all([
      this.mcpClient.listTools(),
      this.mcpClient.listPrompts().catch(() => [] as MCPPrompt[])
    ]);

    const candidateTools = this.filterToolsForQuery(userQuery, tools);
    const promptMessages = await this.resolvePrompt(userQuery, prompts);

    const history: any[] = [];
    const usedTools = new Set<string>();

    // Prefetch vessel context if needed
    if (this.queryMentionsVessel(userQuery)) {
      try {
        logger.debug('Prefetching vessel data');
        const vesselsResult = await this.mcpClient.callTool('get_vessels', {});
        const extractedResult = this.extractToolResult(vesselsResult);

        history.push({
          tool: 'get_vessels',
          arguments: {},
          result: extractedResult
        });
        usedTools.add('get_vessels');

        logger.debug('Vessels prefetched', { result: extractedResult });
      } catch (error) {
        logger.error('Vessel prefetch error', error);
      }
    }

    // Orchestration loop
    for (let step = 0; step < 5; step++) {
      logger.debug(`Orchestration step ${step + 1}`);

      const decision = await this.chooseNextAction(
        userQuery,
        candidateTools,
        history,
        usedTools,
        promptMessages
      );

      logger.debug('Decision made', { decision });

      if (decision.type === 'final_answer') {
        logger.info('Final answer decision received, generating summary');

        // Always generate a summary from history, don't return "done"
        if (history.length > 0) {
          return await this.summarizeAnswer(userQuery, history, promptMessages);
        }

        // If no history, try to return message if it's not just "done"
        if (typeof decision.message === 'string' && decision.message !== 'done') {
          return decision.message;
        }

        // If message is an object
        if (typeof decision.message === 'object') {
          logger.debug('Decision message is object, summarizing');
          history.push({
            tool: 'final_data',
            result: decision.message
          });
          return await this.summarizeAnswer(userQuery, history, promptMessages);
        }

        return 'I was unable to gather information about your vessel. Please try again.';
      }

      if (decision.type === 'ask_user') {
        logger.info('Asking user for clarification');
        return String(decision.message || 'Could you provide more information?');
      }

      if (decision.type === 'tool_call') {
        if (usedTools.has(decision.tool)) {
          logger.debug('Tool already used, skipping and continuing', { tool: decision.tool });
          // Add a note to history so Mistral knows to try something different
          history.push({
            tool: decision.tool,
            arguments: decision.arguments,
            error: 'Already called — choose a different tool or return final_answer'
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

          usedTools.add(decision.tool);
          logger.debug('Tool executed', { tool: decision.tool, resultPreview: JSON.stringify(extractedResult).substring(0, 200) });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.error(`Tool ${decision.tool} failed`, error);
          // Tell Mistral the tool failed so it can try an alternative
          history.push({
            tool: decision.tool,
            arguments: decision.arguments,
            error: `Tool failed: ${errMsg}`
          });
          usedTools.add(decision.tool);
        }
      }
    }

    logger.info('Generating summary from history after loop completion');

    // If we have history, summarize it
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
    usedTools: Set<string>,
    promptMessages: MCPPromptMessage[] = []
  ): Promise<any> {
    const langNames: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German' };
    const responseLang = langNames[this.language] ?? 'English';

    const systemPrompt = `You are the PostgSail Assistant for maritime vessel tracking.

Your job is to decide the next action to answer the user's query.

Rules:
- Return ONLY valid JSON
- Do NOT return formatted text in final_answer, just indicate you're done
- Let the summary step handle formatting
- Use available tools to gather data
- Once you have enough data, return: {"type": "final_answer", "message": "done"}
- The user's preferred language is ${responseLang}; use it for any "ask_user" messages

Response format:
{"type": "tool_call", "tool": "name", "arguments": {}}
{"type": "ask_user", "message": "question"}
{"type": "final_answer", "message": "done"}`;

    // Truncate history to avoid bloating the prompt on long loops
    const recentHistory = history.slice(-8);

    const userPrompt = `Query: "${userQuery}"
Tools: ${JSON.stringify(tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })))}
Used: ${JSON.stringify([...usedTools])}
History: ${JSON.stringify(recentHistory)}`;

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
      logger.error('Decision error', error);
      return { type: 'final_answer', message: 'done' };
    }
  }

  private async summarizeAnswer(userQuery: string, history: any[], promptMessages: MCPPromptMessage[] = []): Promise<string> {
    const langNames: Record<string, string> = { en: 'English', fr: 'French', es: 'Spanish', de: 'German' };
    const responseLang = langNames[this.language] ?? 'English';

    const systemPrompt = `You are the PostgSail Assistant for maritime vessel tracking. Create a concise, well-formatted Telegram message answering the user's query based on the collected data.

Keep it:
- Directly answer the user's question — do not always use a vessel summary format
- Clear and readable on mobile
- Use bullet points for lists
- Include relevant emojis for visual appeal
- Highlight the most important values
- Use Markdown formatting (bold with **, italic with _, code with \`)
- Write the entire response in ${responseLang}

Return ONLY the formatted message text, no JSON.`;

    const historyText = JSON.stringify(history, null, 2);
    logger.debug('Summarizing with history', { historyLength: historyText.length });

    const messages: any[] = [{ role: 'system', content: systemPrompt }];
    for (const pm of promptMessages) {
      const text = pm.content.type === 'text' ? (pm.content as any).text : JSON.stringify(pm.content);
      messages.push({ role: pm.role, content: text });
    }
    messages.push({ role: 'user', content: `User query: "${userQuery}"\n\nCollected data:\n${historyText}\n\nProvide a helpful summary:` });

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

      // Handle if content is not a string
      if (typeof content !== 'string') {
        logger.error('Content is not a string', { content, type: typeof content });
        return 'Sorry, I had trouble formatting the response.';
      }

      logger.debug('Summary created', { length: content.length });
      return content;
    } catch (error) {
      logger.error('Summary error', error);
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

  private filterToolsForQuery(query: string, tools: any[]): any[] {
    const queryLower = query.toLowerCase();

    // PostgSail domain keywords
    const keywords = {
      vessel: ['vessel', 'boat', 'ship', 'my boat', 'summary'],
      monitoring: ['status', 'live', 'current', 'now', 'monitoring', 'position', 'where'],
      logs: ['trip', 'log', 'journey', 'sailed', 'voyage', 'history', 'track'],
      moorages: ['moorage', 'anchor', 'dock', 'port', 'marina', 'stayed'],
      stays: ['stay', 'stopped', 'anchored', 'docked'],
      stats: ['statistics', 'stats', 'summary', 'total', 'count'],
      settings: ['settings', 'configuration', 'preferences']
    };

    // Score tools based on relevance
    const scored = tools.map(tool => {
      let score = 0;
      const toolName = (tool.name || '').toLowerCase();
      const toolDesc = (tool.description || '').toLowerCase();

      // Check keyword matches
      for (const [category, terms] of Object.entries(keywords)) {
        if (terms.some(term => queryLower.includes(term))) {
          if (toolName.includes(category)) score += 10;
          if (toolDesc.includes(category)) score += 5;
        }
      }

      // Direct name matches
      if (queryLower.split(/\s+/).some(word => toolName.includes(word))) {
        score += 3;
      }

      return { tool, score };
    });

    // Return top 12 tools, or all if no scores
    const filtered = scored.filter(item => item.score > 0);
    if (filtered.length === 0) {
      logger.debug('No tool filtering match, using first 12');
      return tools.slice(0, 12);
    }

    const selectedTools = filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(item => item.tool);

    logger.debug('Tools filtered', { count: selectedTools.length });
    return selectedTools;
  }

  private queryMentionsVessel(query: string): boolean {
    const q = query.toLowerCase();
    const mentions = ['vessel', 'boat', 'ship', 'summary'].some(word => q.includes(word));
    logger.debug('Query mentions vessel?', { mentions, query: q });
    return mentions;
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
            return parsed;
          } catch {
            logger.debug('Returning raw text content');
            return item.text;
          }
        }
      }
    }

    return result;
  }
}
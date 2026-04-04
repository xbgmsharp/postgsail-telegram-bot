import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';

const logger = new Logger('MCPClient');

interface MCPTool {
  name: string;
  title?: string;
  description?: string;
  inputSchema?: any;
}

export interface MCPPrompt {
  name: string;
  title?: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: { type: 'text'; text: string } | { type: string; [key: string]: any };
}

interface MCPResponse {
  error?: {
    code: number;
    message: string;
  };
  result?: any;
}

export class MCPClient {
  private url: string;
  private token: string;
  private initialized: boolean = false;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
    logger.info('MCP Client initialized', { url, tokenLength: token.length });
  }

  private async rpc(method: string, params?: any): Promise<any> {
    const requestId = uuidv4();
    logger.debug(`MCP RPC: ${method}`, { requestId, params });
    
    const payload = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params: params || {}
    };

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify(payload)
      });

      logger.debug(`MCP Response: ${method}`, { 
        requestId,
        status: response.status,
        statusText: response.statusText 
      });

      if (!response.ok) {
        throw new Error(`MCP request failed: ${response.status}`);
      }

      const data = await response.json() as MCPResponse;
      
      if (data.error) {
        logger.error(`MCP error on ${method}`, data.error);
        throw new Error(`MCP error on ${method}: ${JSON.stringify(data.error)}`);
      }
      
      logger.success(`MCP RPC ${method} completed`, { requestId });
      return data.result;
    } catch (error) {
      logger.error(`MCP RPC ${method} failed`, error);
      throw error;
    }
  }

  private async notify(method: string, params?: any): Promise<void> {
    logger.debug(`MCP Notify: ${method}`, { params });
    
    const payload = {
      jsonrpc: '2.0',
      method,
      params: params || {}
    };

    await fetch(this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(payload)
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('MCP already initialized');
      return;
    }

    logger.info('Initializing MCP connection');

    await this.rpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: {
        name: 'postgsail-telegram-bot',
        version: '0.7.0'
      }
    });

    await this.notify('notifications/initialized');
    this.initialized = true;
    logger.success('MCP initialized successfully');
  }

  async listTools(): Promise<MCPTool[]> {
    logger.info('Listing available MCP tools');
    await this.initialize();
    const result = await this.rpc('tools/list', {});
    const tools = Array.isArray(result.tools) ? result.tools : result;
    logger.success('MCP tools listed', { count: tools.length });
    return tools;
  }

  async callTool(name: string, args: any): Promise<any> {
    logger.info(`Calling MCP tool: ${name}`, { args });
    await this.initialize();
    const result = await this.rpc('tools/call', {
      name,
      arguments: args
    });
    logger.success(`MCP tool ${name} executed`);
    return result;
  }

  async listPrompts(): Promise<MCPPrompt[]> {
    logger.info('Listing available MCP prompts');
    await this.initialize();
    const result = await this.rpc('prompts/list', {});
    const prompts = Array.isArray(result?.prompts) ? result.prompts : [];
    logger.success('MCP prompts listed', { count: prompts.length });
    return prompts;
  }

  async getPrompt(name: string, args: Record<string, string> = {}): Promise<MCPPromptMessage[]> {
    logger.info(`Getting MCP prompt: ${name}`, { args });
    await this.initialize();
    const result = await this.rpc('prompts/get', { name, arguments: args });
    const messages: MCPPromptMessage[] = Array.isArray(result?.messages) ? result.messages : [];
    logger.success(`MCP prompt ${name} retrieved`, { messageCount: messages.length });
    return messages;
  }
}
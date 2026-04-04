import { Logger } from './logger';
import { MyContext } from '../types/context';

const logger = new Logger('ErrorHandler');

export class AuthError extends Error {
  public statusCode: number;
  constructor(statusCode: number) {
    super(`Authentication failed (${statusCode})`);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export function clearSession(ctx: MyContext) {
  ctx.session.authenticated = false;
  ctx.session.token = undefined;
  ctx.session.tokenTimestamp = undefined;
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class APIError extends Error {
  public statusCode?: number;
  
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

export function handleMistralError(error: any): Error {
  logger.error('Mistral API error', error);
  
  // Check for rate limit (429)
  if (error.message?.includes('Rate limit exceeded') || 
      error.message?.includes('Status 429') ||
      error.raw_status_code === 429) {
    return new RateLimitError(
      'AI service rate limit exceeded. This bot uses Mistral AI which has usage limits. ' +
      'Please try again in a few moments, or consider upgrading your Mistral AI plan for higher limits.'
    );
  }
  
  // Check for other API errors
  if (error.raw_status_code || error.statusCode) {
    const statusCode = error.raw_status_code || error.statusCode;
    return new APIError(
      `AI service error (${statusCode}). Please try again later.`,
      statusCode
    );
  }
  
  return error;
}

export function getUserFriendlyError(error: any): string {
  if (error instanceof RateLimitError) {
    return (
      '⚠️ **Rate Limit Reached**\n\n' +
      'The AI service has reached its usage limit. This happens when:\n' +
      '• Too many requests in a short time\n' +
      '• Free tier limits are exceeded\n\n' +
      '**Solutions:**\n' +
      '1. Wait a few minutes and try again\n' +
      '2. Use specific commands instead (/boat, /monitoring, /logs)\n' +
      '3. Ask the bot administrator to upgrade the Mistral AI plan\n\n' +
      '💡 Commands work without AI and have no rate limits!'
    );
  }
  
  if (error instanceof APIError) {
    return (
      '❌ **Service Error**\n\n' +
      'The AI service encountered an error. Please try again later or use specific commands.'
    );
  }
  
  return '❌ An unexpected error occurred. Please try again or use specific commands.';
}
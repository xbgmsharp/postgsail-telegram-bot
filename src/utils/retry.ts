import { Logger } from './logger';

const logger = new Logger('RetryHelper');

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryOn?: (error: any) => boolean;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    retryOn = () => true
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!retryOn(error)) {
        logger.debug('Error not retryable', { error });
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        logger.warn('Max retry attempts reached', { attempts: maxAttempts });
        break;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error: errorMessage });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Increase delay with backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

// Helper to check if error is retryable
export function isRetryableError(error: any): boolean {
  // Don't retry rate limits (429) or client errors (4xx)
  if (error.raw_status_code >= 400 && error.raw_status_code < 500) {
    return false;
  }
  
  // Retry server errors (5xx) and network errors
  if (error.raw_status_code >= 500 || 
      error.message?.includes('ECONNREFUSED') ||
      error.message?.includes('ETIMEDOUT')) {
    return true;
  }
  
  return false;
}

import { describe, it, expect, vi } from 'vitest';
import {
  AuthError,
  APIError,
  RateLimitError,
  handleMistralError,
  getUserFriendlyError,
  clearSession,
} from '../../src/utils/errors';

describe('AuthError', () => {
  it('has correct name and status code', () => {
    const err = new AuthError(401);
    expect(err.name).toBe('AuthError');
    expect(err.statusCode).toBe(401);
    expect(err.message).toContain('401');
    expect(err instanceof Error).toBe(true);
  });

  it('works for 403', () => {
    const err = new AuthError(403);
    expect(err.statusCode).toBe(403);
  });
});

describe('APIError', () => {
  it('stores status code and message', () => {
    const err = new APIError('Server error', 500);
    expect(err.name).toBe('APIError');
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('Server error');
  });

  it('works without status code', () => {
    const err = new APIError('Unknown error');
    expect(err.statusCode).toBeUndefined();
  });
});

describe('RateLimitError', () => {
  it('has correct name', () => {
    const err = new RateLimitError('too many requests');
    expect(err.name).toBe('RateLimitError');
    expect(err.message).toBe('too many requests');
  });
});

describe('handleMistralError', () => {
  it('returns RateLimitError for 429 raw_status_code', () => {
    const result = handleMistralError({ raw_status_code: 429, message: 'err' });
    expect(result instanceof RateLimitError).toBe(true);
  });

  it('returns RateLimitError when message contains "Rate limit exceeded"', () => {
    const result = handleMistralError({ message: 'Rate limit exceeded' });
    expect(result instanceof RateLimitError).toBe(true);
  });

  it('returns RateLimitError when message contains "Status 429"', () => {
    const result = handleMistralError({ message: 'Status 429 received' });
    expect(result instanceof RateLimitError).toBe(true);
  });

  it('returns APIError for other status codes', () => {
    const result = handleMistralError({ raw_status_code: 500, message: 'err' });
    expect(result instanceof APIError).toBe(true);
    expect((result as APIError).statusCode).toBe(500);
  });

  it('uses statusCode fallback when raw_status_code is absent', () => {
    const result = handleMistralError({ statusCode: 503, message: 'err' });
    expect(result instanceof APIError).toBe(true);
    expect((result as APIError).statusCode).toBe(503);
  });

  it('returns original error when no status code or rate limit info', () => {
    const original = new Error('network failure');
    const result = handleMistralError(original);
    expect(result).toBe(original);
  });
});

describe('getUserFriendlyError', () => {
  it('returns rate limit message for RateLimitError', () => {
    const msg = getUserFriendlyError(new RateLimitError('too many'));
    expect(msg).toContain('Rate Limit');
    expect(msg).toContain('/boat');
  });

  it('returns service error message for APIError', () => {
    const msg = getUserFriendlyError(new APIError('bad', 500));
    expect(msg).toContain('Service Error');
  });

  it('returns generic message for unknown errors', () => {
    const msg = getUserFriendlyError(new Error('weird'));
    expect(msg).toContain('unexpected error');
  });
});

describe('clearSession', () => {
  it('clears token and marks unauthenticated', () => {
    const ctx = {
      session: { authenticated: true, token: 'abc', tokenTimestamp: Date.now() },
    } as any;
    clearSession(ctx);
    expect(ctx.session.authenticated).toBe(false);
    expect(ctx.session.token).toBeUndefined();
    expect(ctx.session.tokenTimestamp).toBeUndefined();
  });
});

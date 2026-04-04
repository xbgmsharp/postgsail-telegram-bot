import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff, isRetryableError } from '../../src/utils/retry';

// Speed up tests by mocking setTimeout
vi.useFakeTimers();

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  it('returns result immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, { initialDelay: 10 });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting all attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    const promise = retryWithBackoff(fn, { maxAttempts: 3, initialDelay: 10 });
    const assertion = expect(promise).rejects.toThrow('always fails');
    await vi.runAllTimersAsync();
    await assertion;

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry when retryOn returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('no retry'));

    await expect(
      retryWithBackoff(fn, { retryOn: () => false })
    ).rejects.toThrow('no retry');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('caps delay at maxDelay', async () => {
    const delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    const fn = vi.fn().mockRejectedValue(new Error('fail'));
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((cb: any, ms?: number) => {
      delays.push(ms ?? 0);
      return originalSetTimeout(cb, 0);
    });

    const promise = retryWithBackoff(fn, {
      maxAttempts: 4,
      initialDelay: 100,
      maxDelay: 250,
      backoffMultiplier: 3,
    });
    const caught = promise.catch(() => {});
    await vi.runAllTimersAsync();
    await caught;

    // delays should be capped at 250: 100, 250, 250
    expect(delays.every(d => d <= 250)).toBe(true);
    vi.restoreAllMocks();
  });
});

describe('isRetryableError', () => {
  it('returns false for 4xx errors', () => {
    expect(isRetryableError({ raw_status_code: 400 })).toBe(false);
    expect(isRetryableError({ raw_status_code: 401 })).toBe(false);
    expect(isRetryableError({ raw_status_code: 404 })).toBe(false);
    expect(isRetryableError({ raw_status_code: 422 })).toBe(false);
  });

  it('returns true for 5xx errors', () => {
    expect(isRetryableError({ raw_status_code: 500 })).toBe(true);
    expect(isRetryableError({ raw_status_code: 503 })).toBe(true);
  });

  it('returns true for ECONNREFUSED', () => {
    expect(isRetryableError({ message: 'connect ECONNREFUSED 127.0.0.1' })).toBe(true);
  });

  it('returns true for ETIMEDOUT', () => {
    expect(isRetryableError({ message: 'connect ETIMEDOUT' })).toBe(true);
  });

  it('returns false for unrecognized errors', () => {
    expect(isRetryableError({ message: 'some other error' })).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../src/api/client';
import { AuthError } from '../../src/utils/errors';

// Helper: build a minimal Response-like object
function mockResponse(body: any, options: { status?: number; headers?: Record<string, string> } = {}) {
  const status = options.status ?? 200;
  const headers = new Headers({
    'content-type': 'application/json',
    ...options.headers,
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

describe('ApiClient', () => {
  let client: ApiClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new ApiClient('https://api.example.com');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('appends trailing slash if missing', () => {
      const c = new ApiClient('https://api.example.com');
      // Verify by checking a request URL
      fetchMock.mockResolvedValue(mockResponse({ token: 't' }));
      c.verification(123);
      expect(fetchMock.mock.calls[0][0]).toContain('https://api.example.com/');
    });

    it('does not double-add trailing slash', () => {
      const c = new ApiClient('https://api.example.com/');
      fetchMock.mockResolvedValue(mockResponse({ token: 't' }));
      c.verification(123);
      expect(fetchMock.mock.calls[0][0]).not.toContain('//rpc');
    });
  });

  describe('setAuth', () => {
    it('sends Authorization header after setAuth', async () => {
      client.setAuth('my-jwt');
      fetchMock.mockResolvedValue(mockResponse({}));
      await client.getMonitoringLive();
      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer my-jwt');
    });

    it('omits Authorization header when no token set', async () => {
      fetchMock.mockResolvedValue(mockResponse({}));
      await client.getMonitoringLive();
      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws AuthError on 401', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, { status: 401 }));
      await expect(client.getLogs()).rejects.toThrow(AuthError);
    });

    it('throws AuthError on 403', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, { status: 403 }));
      await expect(client.getLogs()).rejects.toThrow(AuthError);
    });

    it('throws generic Error on other non-ok status', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, { status: 500 }));
      await expect(client.getLogs()).rejects.toThrow('API request failed: 500');
    });
  });

  describe('verification', () => {
    it('returns verified=true and token when API returns token', async () => {
      fetchMock.mockResolvedValue(mockResponse({ token: 'jwt-abc' }));
      const result = await client.verification(42);
      expect(result).toEqual({ verified: true, token: 'jwt-abc' });
    });

    it('returns verified=false when no token in response', async () => {
      fetchMock.mockResolvedValue(mockResponse({}));
      const result = await client.verification(42);
      expect(result).toEqual({ verified: false });
    });

    it('returns verified=false on network error', async () => {
      fetchMock.mockRejectedValue(new Error('network error'));
      const result = await client.verification(42);
      expect(result).toEqual({ verified: false });
    });
  });

  describe('requestOTP', () => {
    it('returns success=true and code on success', async () => {
      fetchMock.mockResolvedValue(mockResponse({ code: '123456' }));
      const result = await client.requestOTP('user@example.com');
      expect(result).toEqual({ success: true, code: '123456' });
    });

    it('returns success=false on non-ok response', async () => {
      fetchMock.mockResolvedValue(mockResponse({}, { status: 400 }));
      const result = await client.requestOTP('user@example.com');
      expect(result).toEqual({ success: false });
    });
  });

  describe('getLogs query building', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(mockResponse([]));
    });

    it('calls logs_view with default limit', async () => {
      await client.getLogs();
      expect(fetchMock.mock.calls[0][0]).toContain('logs_view?limit=10');
    });

    it('appends start_date filter', async () => {
      await client.getLogs({ start_date: '2024-01-01' });
      expect(fetchMock.mock.calls[0][0]).toContain('started=gte.2024-01-01');
    });

    it('appends end_date filter', async () => {
      await client.getLogs({ end_date: '2024-12-31' });
      expect(fetchMock.mock.calls[0][0]).toContain('ended=lte.2024-12-31');
    });

    it('appends distance filter', async () => {
      await client.getLogs({ distance: 50 });
      expect(fetchMock.mock.calls[0][0]).toContain('distance=gte.50');
    });

    it('appends duration filter in ISO format', async () => {
      await client.getLogs({ duration: 3 });
      expect(fetchMock.mock.calls[0][0]).toContain('duration=gte.PT3H');
    });

    it('appends tags filter', async () => {
      await client.getLogs({ tags: ['race', 'offshore'] });
      expect(fetchMock.mock.calls[0][0]).toContain('tags=cs.');
    });

    it('combines multiple filters', async () => {
      await client.getLogs({ start_date: '2024-01-01', distance: 10 });
      const url: string = fetchMock.mock.calls[0][0];
      expect(url).toContain('started=gte.2024-01-01');
      expect(url).toContain('distance=gte.10');
    });
  });

  describe('getMoorages query building', () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(mockResponse([]));
    });

    it('does not append type filter for "All"', async () => {
      await client.getMoorages({ default_stay_type: 'All' });
      expect(fetchMock.mock.calls[0][0]).not.toContain('default_stay_id');
    });

    it('appends type filter for "Anchor"', async () => {
      await client.getMoorages({ default_stay_type: 'Anchor' });
      expect(fetchMock.mock.calls[0][0]).toContain('default_stay_id=eq.2');
    });

    it('appends type filter for "Dock"', async () => {
      await client.getMoorages({ default_stay_type: 'Dock' });
      expect(fetchMock.mock.calls[0][0]).toContain('default_stay_id=eq.4');
    });
  });

  describe('Content-Range parsing', () => {
    it('parses totalCount from Content-Range header', async () => {
      fetchMock.mockResolvedValue(
        mockResponse([], { headers: { 'Content-Range': '0-9/42' } })
      );
      const result = await client.getLogs() as any;
      expect(result.totalCount).toBe(42);
    });

    it('returns totalCount=null when Content-Range is absent', async () => {
      fetchMock.mockResolvedValue(mockResponse([]));
      const result = await client.getLogs() as any;
      expect(result.totalCount).toBeNull();
    });

    it('returns totalCount=null for wildcard Content-Range', async () => {
      fetchMock.mockResolvedValue(
        mockResponse([], { headers: { 'Content-Range': '0-9/*' } })
      );
      const result = await client.getLogs() as any;
      expect(result.totalCount).toBeNull();
    });
  });
});

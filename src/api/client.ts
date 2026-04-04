import { AuthError } from '../utils/errors';
import { Logger } from '../utils/logger';

const logger = new Logger('ApiClient');

const stayTypeToId: Record<string, number> = {
  All: -1,
  Unknown: 1,
  Anchor: 2,
  Dock: 4,
  'Mooring Buoy': 3,
};

interface TelegramUserData {
  from: {
    id: number;
    is_bot: boolean;
    first_name: string;
    language_code?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: string;
}

export class ApiClient {
  private baseURL: string;
  private token?: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || process.env.POSTGSAIL_API_URL || 'http://localhost:3000';
    if (!this.baseURL.endsWith('/')) this.baseURL += '/';
  }

  setAuth(token: string) {
    this.token = token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'postgsail.telegram.bot v0.3.0',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      throw new AuthError(response.status);
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const contentRange = response.headers.get('Content-Range');
    let totalCount: number | null = null;
    if (contentRange) {
      const match = contentRange.match(/\/(\d+|\*)$/);
      if (match && match[1] !== '*') totalCount = parseInt(match[1], 10);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return { data: await response.json(), totalCount, range: contentRange };
    }
    return response.text();
  }

  private async requestRPC(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'postgsail.telegram.bot v0.7.0',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
      throw new AuthError(response.status);
    }

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) return response.json();
    return response.text();
  }

  // --- Auth / verification (raw fetch, no token) ---

  async verification(chatId: number): Promise<{ verified: boolean; token?: string }> {
    logger.info('Verifying chat ID', { chatId });
    try {
      const response = await fetch(`${this.baseURL}rpc/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: chatId }),
      });
      const data = await response.json() as { token?: string };
      console.log('Verification response data:', data);
      if (data?.token) {
        logger.success('User verified with existing token', { chatId });
        return { verified: true, token: data.token };
      }
      logger.info('User not verified', { chatId });
      return { verified: false };
    } catch (error) {
      logger.error('Verification failed', error);
      return { verified: false };
    }
  }

  async requestOTP(email: string) {
    logger.info('Requesting OTP', { email });
    try {
      const response = await fetch(`${this.baseURL}rpc/telegram_otp_fn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        logger.error('OTP request failed', { status: response.status });
        return { success: false };
      }
      const data = await response.json() as { code?: string };
      logger.success('OTP sent successfully', { email });
      return { success: true, code: data.code };
    } catch (error) {
      logger.error('OTP request failed', error);
      return { success: false };
    }
  }

  async validateOTP(payload: { token: string; telegram_obj: TelegramUserData }) {
    logger.info('Validating OTP', { userId: payload.telegram_obj.from.id });
    try {
      const response = await fetch(`${this.baseURL}rpc/telegram_fn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        logger.error('OTP validation failed', { status: response.status });
        return { success: false };
      }
      logger.success('OTP validated successfully');
      return { success: true };
    } catch (error) {
      logger.error('OTP validation error', error);
      return { success: false };
    }
  }

  async getToken(chatId: number): Promise<string> {
    logger.info('Getting JWT token', { chatId });
    const response = await fetch(`${this.baseURL}rpc/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: chatId }),
    });
    const data = await response.json() as { token: string };
    logger.success('Token retrieved');
    return data.token;
  }

  // --- Data methods ---

  async getVessels() {
    logger.info('Fetching vessels');
    return this.request('vessels_view');
  }

  async getVessel() {
    logger.info('Fetching vessel');
    return this.requestRPC('rpc/vessel_fn');
  }

  async getProfile() {
    logger.info('Fetching profile');
    return this.requestRPC('rpc/profile_fn');
  }

  async getLogs(filters: {
    start_date?: string;
    end_date?: string;
    distance?: number;
    duration?: number;
    tags?: string[];
  } = {}) {
    logger.info('Fetching logs', { filters });
    let query = 'logs_view?limit=10';
    const queryFilters: string[] = [];

    if (filters.start_date) queryFilters.push(`started=gte.${filters.start_date}`);
    if (filters.end_date) queryFilters.push(`ended=lte.${filters.end_date}`);
    if (filters.distance) queryFilters.push(`distance=gte.${filters.distance}`);
    if (filters.duration) queryFilters.push(`duration=gte.PT${filters.duration}H`);
    if (filters.tags?.length) queryFilters.push(`tags=cs.[${JSON.stringify(filters.tags)}]`);
    if (queryFilters.length) query += `&${queryFilters.join('&')}`;

    return this.request(query, { headers: { Prefer: 'count=estimated' } });
  }

  async getLog(id: string) {
    logger.info('Fetching log', { id });
    return this.request(`log_view?id=eq.${id}`);
  }

  async exportLogGeoJSON(logId: string) {
    logger.info('Exporting log as GeoJSON', { logId });
    return this.request('rpc/export_logbook_geojson_trip_fn', {
      method: 'POST',
      body: JSON.stringify({ _id: logId }),
    });
  }

  async exportLogKML(logId: string) {
    logger.info('Exporting log as KML', { logId });
    return this.request('rpc/export_logbook_kml_trip_fn', {
      method: 'POST',
      headers: { Accept: 'text/xml' },
      body: JSON.stringify({ _id: logId }),
    });
  }

  async exportLogGPX(logId: string) {
    logger.info('Exporting log as GPX', { logId });
    return this.request('rpc/export_logbook_gpx_trip_fn', {
      method: 'POST',
      headers: { Accept: 'text/xml' },
      body: JSON.stringify({ _id: logId }),
    });
  }

  async getMoorages(filters: { default_stay_type?: string } = {}) {
    logger.info('Fetching moorages', { filters });
    let query = 'moorages_view?limit=10';
    const stayTypeId = stayTypeToId[filters.default_stay_type || 'All'];
    if (stayTypeId !== undefined && stayTypeId !== -1) {
      query += `&default_stay_id=eq.${stayTypeId}`;
    }
    return this.request(query, { headers: { Prefer: 'count=estimated' } });
  }

  async getStays(filters: {
    arrived?: string;
    departed?: string;
    stay_type?: string;
    duration?: number;
  } = {}) {
    logger.info('Fetching stays', { filters });
    let query = 'stays_view?limit=10';
    const queryFilters: string[] = [];

    if (filters.arrived) queryFilters.push(`arrived=gte.${filters.arrived}`);
    if (filters.departed) queryFilters.push(`departed=lte.${filters.departed}`);
    if (filters.duration) queryFilters.push(`duration=gte.PT${filters.duration}H`);

    const stayTypeId = stayTypeToId[filters.stay_type || 'All'];
    if (stayTypeId !== undefined && stayTypeId !== -1) {
      queryFilters.push(`stayed_at_id=eq.${stayTypeId}`);
    }
    if (queryFilters.length) query += `&${queryFilters.join('&')}`;

    return this.request(query, { headers: { Prefer: 'count=estimated' } });
  }

  async getMonitoring() {
    logger.info('Fetching monitoring data');
    return this.request('monitoring_view');
  }

  async getMonitoringLive() {
    logger.info('Fetching live monitoring data');
    return this.request('monitoring_live');
  }

  async getStatsLogs() {
    logger.info('Fetching log statistics');
    return this.request('stats_logs_view');
  }

  async getLogsByMonth() {
    logger.info('Fetching logs by month');
    return this.requestRPC('rpc/logs_by_month_fn');
  }

  async getLogsByWeek() {
    logger.info('Fetching logs by week');
    return this.requestRPC('rpc/logs_by_week_fn');
  }
}

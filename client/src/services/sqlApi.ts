/**
 * Typed wrappers around the SQL-backed MAUSAM endpoints.
 * Every call goes through `apiRequest` (timeout + cookie + error handling).
 */
import { apiRequest, setAuthToken } from './apiClient';
import type {
  AqiPoint,
  AuthUser,
  CurrentWeather,
  DashboardResponse,
  DatasetInfo,
  ForecastDay,
  HourlyPoint,
  InterestOption,
  LocationDef,
  ObservationPoint,
  SqlEnvelope,
  UserPreferences,
  WeatherEnvelope,
  Warning
} from '../types';

export type CurrentObservation = CurrentWeather & { isDemo: boolean; sourceLabel: string };

export const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'general', label: 'General', description: 'Everyday conditions and a balanced briefing.' },
  { id: 'agriculture', label: 'Agriculture', description: 'Rainfall, humidity and field-work windows.' },
  { id: 'aviation', label: 'Aviation', description: 'Visibility, wind and pressure for flight safety.' },
  { id: 'health', label: 'Health', description: 'Heat, rain and severe-weather health guidance.' },
  { id: 'sports', label: 'Sports & Fitness', description: 'Best outdoor training windows.' },
  { id: 'travel', label: 'Travel', description: 'Multi-day outlook for trip planning.' },
  { id: 'marine', label: 'Marine & Coastal', description: 'Wind and severe-weather coastal advisories.' },
  { id: 'disaster', label: 'Disaster Management', description: 'Severe-weather first, always.' },
  { id: 'science', label: 'Research & Science', description: 'Raw temperature, humidity and pressure series.' }
];

export interface DatasetIngestResult {
  ok: boolean;
  locations: number;
  liveObservations: number;
  sourceMode: string;
}

export const sqlApi = {
  // ---------------------------------------------------------------- locations
  locations: () => apiRequest<{ data: LocationDef[] }>('/api/locations').then((r) => r.data),
  searchLocations: (q: string, limit = 20) =>
    apiRequest<{ data: LocationDef[] }>(`/api/locations/search?q=${encodeURIComponent(q)}&limit=${limit}`).then((r) => r.data),

  // ----------------------------------------------------------------- dataset
  datasetInfo: () => apiRequest<{ data: DatasetInfo }>('/api/dataset/info').then((r) => r.data),
  datasetIngest: () => apiRequest<{ data: DatasetIngestResult }>('/api/dataset/ingest', { method: 'POST', timeoutMs: 30000 }).then((r) => r.data),

  // ----------------------------------------------------------------- weather
  weather: (location: string, demo = false) =>
    apiRequest<{ data: WeatherEnvelope }>(`/api/weather?location=${encodeURIComponent(location)}&demo=${demo ? 1 : 0}`).then((r) => r.data),
  weatherCurrent: (location: string) =>
    apiRequest<SqlEnvelope<CurrentObservation | null>>(`/api/weather/current?location=${encodeURIComponent(location)}`),
  weatherHourly: (location: string) =>
    apiRequest<SqlEnvelope<HourlyPoint[]>>(`/api/weather/hourly?location=${encodeURIComponent(location)}`).then((r) => r.data),
  weatherForecast: (location: string) =>
    apiRequest<SqlEnvelope<ForecastDay[]>>(`/api/weather/forecast?location=${encodeURIComponent(location)}`).then((r) => r.data),
  weatherHistory: (location: string, start?: string, end?: string) => {
    const qs = new URLSearchParams({ location });
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    return apiRequest<SqlEnvelope<ObservationPoint[]>>(`/api/weather/history?${qs.toString()}`).then((r) => r);
  },
  weatherAqi: (location: string, start?: string, end?: string) => {
    const qs = new URLSearchParams({ location });
    if (start) qs.set('start', start);
    if (end) qs.set('end', end);
    return apiRequest<SqlEnvelope<{ latest: AqiPoint | null; history: AqiPoint[] }>>(`/api/weather/aqi?${qs.toString()}`).then((r) => r);
  },
  weatherAlerts: (location: string) =>
    apiRequest<SqlEnvelope<(Warning & { id: number; isDemo: boolean; instructions: string })[]>>(
      `/api/weather/alerts?location=${encodeURIComponent(location)}`
    ).then((r) => r),

  // --------------------------------------------------------------- dashboard
  dashboard: (location: string, interests: string[], persona?: string) => {
    const qs = new URLSearchParams({ location, interests: interests.join(',') });
    if (persona) qs.set('persona', persona);
    return apiRequest<DashboardResponse>(`/api/dashboard?${qs.toString()}`).then((r) => r);
  },

  // -------------------------------------------------------------------- auth
  auth: {
    register: (email: string, password: string, displayName?: string) =>
      apiRequest<{ user: AuthUser; token: string }>('/api/auth/register', {
        method: 'POST',
        body: { email, password, displayName },
        auth: false
      }).then((r) => {
        setAuthToken(r.token);
        return r;
      }),
    login: (email: string, password: string) =>
      apiRequest<{ user: AuthUser; token: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false
      }).then((r) => {
        setAuthToken(r.token);
        return r;
      }),
    logout: () =>
      apiRequest<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).finally(() => setAuthToken(null)),
    me: () => apiRequest<{ user: AuthUser; preferences: UserPreferences }>('/api/auth/me', { auth: true })
  },

  // --------------------------------------------------------------- user data
  user: {
    getProfile: () => apiRequest<{ profile: AuthUser }>('/api/user/profile').then((r) => r.profile),
    updateProfile: (displayName: string) =>
      apiRequest<{ profile: AuthUser }>('/api/user/profile', { method: 'PUT', body: { displayName } }).then((r) => r.profile),
    getPreferences: () => apiRequest<{ preferences: UserPreferences }>('/api/user/preferences').then((r) => r.preferences),
    updatePreferences: (patch: Partial<UserPreferences>) =>
      apiRequest<{ preferences: UserPreferences }>('/api/user/preferences', { method: 'PUT', body: patch }).then((r) => r.preferences),
    getInterests: () => apiRequest<{ interests: string[] }>('/api/user/interests').then((r) => r.interests),
    updateInterests: (interests: string[]) =>
      apiRequest<{ interests: string[] }>('/api/user/interests', { method: 'PUT', body: { interests } }).then((r) => r.interests)
  }
};

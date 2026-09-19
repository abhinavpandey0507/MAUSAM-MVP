import type {
  LocationDef,
  LiveStatusInfo,
  NowcastItem,
  PersonalizationResult,
  RadarInfo,
  SatelliteInfo,
  Warning,
  WeatherEnvelope,
  PersonaId
} from '../types';
import { simulateWeatherEnvelope } from './fallbackSim';

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const body = await res.json();
  if (body && body.ok === false) throw new Error(body.error || 'Request failed');
  return body as T;
}

/** True when running on a static host (GitHub Pages) with no /api backend. */
const isStaticHost = (): boolean =>
  typeof window !== 'undefined' && /github\.io/.test(window.location.hostname);

export const api = {
  weather: async (location: string, demo: boolean) => {
    if (isStaticHost()) {
      const sim = simulateWeatherEnvelope(location, demo);
      if (sim) return sim;
    }
    try {
      return await get<{ data: WeatherEnvelope }>(`/api/weather?location=${location}&demo=${demo ? 1 : 0}`).then((r) => r.data);
    } catch {
      const sim = simulateWeatherEnvelope(location, demo);
      if (sim) return sim;
      throw new Error('Weather data unavailable from the current source.');
    }
  },
  radar: async (location: string) => {
    if (isStaticHost()) return null;
    try {
      return await get<{ data: RadarInfo | null }>(`/api/radar?location=${location}`).then((r) => r.data);
    } catch {
      return null;
    }
  },
  satellite: async () => {
    if (isStaticHost()) return null;
    try {
      return await get<{ data: SatelliteInfo | null }>('/api/satellite').then((r) => r.data);
    } catch {
      return null;
    }
  },
  locations: () => get<{ data: LocationDef[] }>('/api/locations').then((r) => r.data),
  status: () => get<{ live: LiveStatusInfo & { liveEnabled: boolean } }>('/api/status').then((r) => r.live),
  personalize: (persona: PersonaId, location: string, demo: boolean) =>
    get<{ result: PersonalizationResult }>(
      `/api/personalize?persona=${persona}&location=${location}&demo=${demo ? 1 : 0}`
    ).then((r) => r.result)
};

export async function fetchAlerts(location: string, demo: boolean) {
  try {
    return await get<{ data: { warnings: Warning[]; nowcast: NowcastItem[] } }>(
      `/api/alerts?location=${location}&demo=${demo ? 1 : 0}`
    ).then((r) => r.data);
  } catch {
    const sim = simulateWeatherEnvelope(location, demo);
    return sim ? { warnings: sim.warnings, nowcast: sim.nowcast } : { warnings: [], nowcast: [] };
  }
}
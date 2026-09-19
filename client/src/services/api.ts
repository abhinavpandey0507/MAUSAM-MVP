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

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const body = await res.json();
  if (body && body.ok === false) throw new Error(body.error || 'Request failed');
  return body as T;
}

export const api = {
  weather: (location: string, demo: boolean) =>
    get<{ data: WeatherEnvelope }>(`/api/weather?location=${location}&demo=${demo ? 1 : 0}`).then((r) => r.data),
  radar: (location: string) => get<{ data: RadarInfo | null }>(`/api/radar?location=${location}`).then((r) => r.data),
  satellite: () => get<{ data: SatelliteInfo | null }>('/api/satellite').then((r) => r.data),
  locations: () => get<{ data: LocationDef[] }>('/api/locations').then((r) => r.data),
  status: () => get<{ live: LiveStatusInfo & { liveEnabled: boolean } }>('/api/status').then((r) => r.live),
  personalize: (persona: PersonaId, location: string, demo: boolean) =>
    get<{ result: PersonalizationResult }>(
      `/api/personalize?persona=${persona}&location=${location}&demo=${demo ? 1 : 0}`
    ).then((r) => r.result)
};

export async function fetchAlerts(location: string, demo: boolean) {
  return get<{ data: { warnings: Warning[]; nowcast: NowcastItem[] } }>(
    `/api/alerts?location=${location}&demo=${demo ? 1 : 0}`
  ).then((r) => r.data);
}
export type Language = 'en' | 'hi' | 'pa';

export type PersonaId =
  | 'runner'
  | 'farmer'
  | 'commuter'
  | 'aviation'
  | 'traveler'
  | 'family'
  | 'event'
  | 'beach'
  | 'gardener'
  | 'general'
  | 'cyclist'
  | 'outdoor'
  | 'student'
  | 'researcher';

export type Severity = 'no_warning' | 'watch' | 'alert' | 'warning';

export type MetricSource = 'imd' | 'simulated';

export interface SourceMeta {
  live: boolean;
  via: string;
  provider: string;
  label: 'LIVE' | 'SIMULATED';
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  pressure: number;
  visibility: number;
  rainfall: number;
  weatherCondition: string;
  observedAt: string;
  stationName?: string;
  source: MetricSource;
  sourceMeta: SourceMeta;
}

export interface ForecastDay {
  date: string;
  weekday: string;
  tMax: number;
  tMin: number;
  condition: string;
  rainProb: number;
  rainfall: number;
  humidity: number;
  windSpeed: number;
}

export interface HourlyPoint {
  time: string;
  label: string;
  temperature: number;
  rainProb: number;
  humidity: number;
}

export interface Warning {
  severity: Severity;
  event: string;
  area: string;
  detail?: string;
  validFrom: string;
  validUntil: string;
  source: string;
}

export interface NowcastItem {
  location: string;
  type: string;
  severity: Severity;
  validFrom: string;
  validUntil: string;
  description: string;
  source: string;
}

export interface RainfallRow {
  district: string;
  state: string;
  date: string;
  actual: number;
  normal: number;
  departure: number;
  source: string;
}

export interface LiveStatusInfo {
  imdV1: string;
  observationScrape: string;
  radarProducts: string;
  satelliteImagery: string;
  apiKeyConfigured: boolean;
  liveEnabled: boolean;
}

export interface WeatherMeta {
  dataMode: 'live' | 'mixed' | 'demo' | 'fallback';
  dataSourceLabel: string;
  imdUnavailable: boolean;
  lastUpdated: string;
  sources: Record<string, string>;
  liveStatus: LiveStatusInfo;
}

export interface WeatherEnvelope {
  location: string;
  locationId: string;
  lat: number;
  lon: number;
  unit: 'C';
  current: CurrentWeather | null;
  hourly: HourlyPoint[];
  forecast: ForecastDay[];
  warnings: Warning[];
  nowcast: NowcastItem[];
  rainfall: RainfallRow[];
  meta: WeatherMeta;
}

export interface RadarInfo {
  station: string;
  radarCode: string;
  sri: string;
  maxz: string;
  animationPage: string;
  mosaicPage: string;
  radarPage: string;
  source: string;
  sourceLabel: string;
  provider: string;
  lastUpdated: string;
}

export interface SatelliteInfo {
  imageUrl: string;
  satellitePage: string;
  rapidscanPage: string;
  product: string;
  updatedEveryMinutes: number;
  source: string;
  sourceLabel: string;
  provider: string;
  lastUpdated: string;
}

export interface LocationDef {
  id: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export interface WhyFactor {
  text: string;
  ok: boolean;
}

export interface PriorityCard {
  id: string;
  reason: WhyFactor[];
}

export interface Insight {
  tone: 'positive' | 'caution' | 'severe' | 'neutral';
  headline: string;
  text: string;
  basedOn: string;
}

export interface PersonalizedInsight {
  headline: string;
  text: string;
  window?: string;
  bullets: string[];
  why: WhyFactor[];
  note: string;
}

export interface PersonalizationResult {
  persona: PersonaId;
  personaLabel: string;
  greetingSuffix: string;
  safetyActive: boolean;
  topWarning: Warning | null;
  priorityOrder: string[];
  cards: PriorityCard[];
  insights: Insight[];
  recommendation: PersonalizedInsight;
}

export interface Profile {
  name: string;
  phone: string;
  email: string;
  persona: PersonaId;
  personas: PersonaId[];
  requirements: string[];
  language: Language;
  activity: string;
  notify: { alerts: boolean; daily: boolean; insights: boolean };
  onboarded: boolean;
  assistantIntroSeen: boolean;
}

export interface AppState {
  persona: PersonaId;
  location: string;
  language: Language;
  demoMode: boolean;
  severeSim: boolean;
  voiceEnabled: boolean;
  voiceAutoSpeak: boolean;
  profile: Profile;
}
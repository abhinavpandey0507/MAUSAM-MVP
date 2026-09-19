import type {
  PersonaId,
  PersonalizationResult,
  PriorityCard,
  Severity,
  Warning,
  WeatherEnvelope,
  WhyFactor
} from '../types';
import { REQUIREMENT_BOOSTS } from '../data/requirements';
import { getPersona } from '../data/personas';
import { insightsFor, buildRecommendation } from './recommendations';

export const CARD_IDS = {
  severe_alert: 'severe_alert',
  outdoor_window: 'outdoor_window',
  current: 'current',
  temperature: 'temperature',
  uv: 'uv',
  wind: 'wind',
  humidity: 'humidity',
  air_quality: 'air_quality',
  rain: 'rain',
  rainfall: 'rainfall',
  field_work: 'field_work',
  severe_weather: 'severe_weather',
  forecast_5: 'forecast_5',
  farm_insight: 'farm_insight',
  rain_risk: 'rain_risk',
  visibility: 'visibility',
  fog: 'fog',
  storm: 'storm',
  hourly: 'hourly',
  destination: 'destination',
  forecast_7: 'forecast_7',
  travel_insight: 'travel_insight',
  commute: 'commute',
  generic: 'generic',
  sea_conditions: 'sea_conditions',
  aviation: 'aviation'
} as const;

export type CardId = (typeof CARD_IDS)[keyof typeof CARD_IDS];

/** Canonical order used for stable tie-breaking in the scoring layer. */
export const ALL_CARDS: CardId[] = [
  'severe_alert',
  'outdoor_window',
  'current',
  'temperature',
  'uv',
  'wind',
  'humidity',
  'air_quality',
  'rain',
  'rainfall',
  'field_work',
  'severe_weather',
  'forecast_5',
  'farm_insight',
  'rain_risk',
  'visibility',
  'fog',
  'storm',
  'hourly',
  'destination',
  'forecast_7',
  'travel_insight',
  'commute',
  'generic',
  'sea_conditions',
  'aviation'
];

/**
 * Base widget weights per persona (the "priority score" table).
 * 0 = not relevant unless a selected requirement boosts it.
 * Final order = score desc (multi-persona scores averaged), severe alert prepended.
 */
export const PERSONA_WEIGHTS: Record<PersonaId, Partial<Record<CardId, number>>> = {
  runner: { outdoor_window: 100, temperature: 92, uv: 86, air_quality: 84, wind: 82, rain: 80, humidity: 78, severe_weather: 96, hourly: 62, forecast_5: 45, current: 40 },
  farmer: { rainfall: 100, rain_risk: 95, field_work: 92, farm_insight: 88, rain: 85, temperature: 82, humidity: 78, severe_weather: 96, forecast_5: 72, hourly: 60, current: 40 },
  commuter: { commute: 100, rain_risk: 96, visibility: 94, fog: 90, severe_weather: 92, storm: 90, rain: 86, wind: 78, hourly: 74, forecast_5: 50, current: 40 },
  aviation: { aviation: 100, visibility: 96, wind: 92, severe_weather: 96, storm: 86, temperature: 70, humidity: 50, forecast_5: 62, current: 45 },
  traveler: { destination: 100, forecast_7: 92, travel_insight: 90, rain_risk: 78, rain: 84, severe_weather: 94, temperature: 76, hourly: 55, current: 40 },
  family: { severe_weather: 98, rain_risk: 90, rain: 88, air_quality: 86, outdoor_window: 78, temperature: 80, humidity: 70, forecast_5: 72, commute: 68, current: 45 },
  event: { rain: 100, outdoor_window: 92, rain_risk: 90, temperature: 86, wind: 82, severe_weather: 94, forecast_7: 78, forecast_5: 76, current: 45 },
  beach: { sea_conditions: 100, wind: 92, severe_weather: 88, temperature: 72, uv: 64, visibility: 56, humidity: 60, forecast_5: 55, current: 45 },
  gardener: { rainfall: 94, rain: 90, farm_insight: 86, field_work: 78, temperature: 85, humidity: 80, fog: 68, forecast_5: 62, current: 45 },
  general: { current: 100, temperature: 95, humidity: 82, wind: 74, rain: 86, forecast_5: 82, severe_weather: 90, air_quality: 64, rainfall: 55, uv: 46 },
  cyclist: { rain_risk: 94, severe_weather: 94, rain: 86, wind: 90, temperature: 86, commute: 88, humidity: 76, uv: 72, outdoor_window: 66, current: 42 },
  outdoor: { temperature: 94, outdoor_window: 90, severe_weather: 96, rain: 88, wind: 82, uv: 84, storm: 84, humidity: 78, field_work: 60, current: 42 },
  student: { severe_weather: 90, rain: 82, temperature: 86, forecast_5: 80, commute: 84, humidity: 62, uv: 58, air_quality: 52, outdoor_window: 55, current: 40 },
  researcher: { forecast_7: 92, forecast_5: 86, rainfall: 86, severe_weather: 94, rain: 80, wind: 72, temperature: 76, visibility: 66, storm: 82, aviation: 72, current: 45 }
};

export const PERSONA_GREETING: Record<PersonaId, string> = {
  runner: 'RUNNER',
  farmer: 'FARMER',
  commuter: 'DRIVER',
  aviation: 'AVIATION',
  traveler: 'TRAVELER',
  family: 'FAMILY',
  event: 'EVENT',
  beach: 'BEACH',
  gardener: 'GARDENER',
  general: 'GENERAL',
  cyclist: 'CYCLIST',
  outdoor: 'OUTDOOR',
  student: 'STUDENT',
  researcher: 'RESEARCH'
};

const REQUIREMENT_BOOST = 18;

export const SEVERITY_RANK: Record<Severity, number> = { no_warning: 0, watch: 1, alert: 2, warning: 3 };

export function topWarning(warnings: Warning[] | undefined | null): Warning | null {
  const list = warnings ?? [];
  if (!list.length) return null;
  return list.reduce((a, b) => (SEVERITY_RANK[b.severity] > SEVERITY_RANK[a.severity] ? b : a), list[0]);
}

/**
 * Scoring layer: weighted persona base + requirement boosts, averaged across
 * the selected (multi) personas. Returns the ordered list of widget ids.
 * Severe-warning handling happens in personalize() by prepending severe_alert.
 */
export function scoreOrder(personas: PersonaId[], requirements: string[]): CardId[] {
  const boosts = new Map<string, number>();
  for (const req of requirements) {
    for (const card of REQUIREMENT_BOOSTS[req] ?? []) boosts.set(card, (boosts.get(card) ?? 0) + REQUIREMENT_BOOST);
  }
  const totals = new Map<string, number>();
  for (const pid of personas) {
    const weights = PERSONA_WEIGHTS[pid] ?? {};
    for (const card of ALL_CARDS) {
      const boosted = Math.min(100, (weights[card] ?? 0) + (boosts.get(card) ?? 0));
      totals.set(card, (totals.get(card) ?? 0) + boosted);
    }
  }
  const count = Math.max(1, personas.length);
  return ALL_CARDS.map((card) => ({ card, score: (totals.get(card) ?? 0) / count }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || ALL_CARDS.indexOf(a.card) - ALL_CARDS.indexOf(b.card))
    .map((c) => c.card);
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function whyFactors(cardId: CardId, weather: WeatherEnvelope | null, warning: Warning | null): WhyFactor[] {
  const w = weather?.current ?? null;
  const today = weather?.forecast?.[0] ?? null;
  const factors: WhyFactor[] = [];
  const push = (text: string, ok: boolean) => factors.push({ text, ok });
  const temp = num(w?.temperature) ?? num(today?.tMax);
  const rainProb = num(today?.rainProb) ?? 0;
  const wind = num(w?.windSpeed);
  const hum = num(w?.humidity);
  const vis = num(w?.visibility);

  switch (cardId) {
    case 'outdoor_window':
      push(`Temperature of ${temp ?? 'n/a'}°C is within a comfortable outdoor band`, temp != null && temp >= 12 && temp <= 34);
      push(`Rain probability of ${rainProb}% is low enough for outdoor activity`, rainProb <= 40);
      push(`Wind ${wind != null ? wind + ' km/h' : 'n/a'} is moderate`, wind == null || wind <= 25);
      push('Recommended window avoids peak heat and high UV hours', true);
      break;
    case 'temperature':
      push(`Current temperature is ${w?.temperature ?? 'n/a'}°C, feels like ${w?.feelsLike ?? 'n/a'}°C`, true);
      push('Feels-like accounts for humidity in warm conditions', true);
      break;
    case 'uv':
      push('UV index is not provided by the current IMD source', false);
      push('Shown because UV matters for outdoor exposure planning', true);
      break;
    case 'wind':
      push(`Wind: ${w?.windDirection || '--'} ${wind != null ? wind + ' km/h' : 'n/a'}`, true);
      push('Wind is prioritized because it affects comfort and safety', true);
      break;
    case 'humidity':
      push(`Relative humidity is ${hum ?? 'n/a'}%`, hum != null);
      push('High humidity raises the feels-like temperature', hum != null && hum > 60);
      break;
    case 'air_quality':
      push('Air quality is not provided by the current IMD source', false);
      break;
    case 'rain':
    case 'rain_risk':
    case 'rainfall':
      push(`Rain probability today is ${rainProb}%`, true);
      push(`Expected rainfall ${today?.rainfall ?? 0} mm`, (today?.rainfall ?? 0) > 0);
      break;
    case 'field_work':
      push(`Today's rain probability is ${rainProb}% - dry windows favour field work`, rainProb <= 45);
      push('Temperature and humidity influence labour comfort', temp != null);
      break;
    case 'visibility':
      push(`Visibility ${vis != null ? vis.toFixed(1) : 'n/a'} km (lower = higher risk)`, vis != null && vis >= 2);
      break;
    case 'fog':
      push('Fog risk rises with humidity above 85% and calm winds', hum != null && hum > 85);
      push('Fog is more common in morning hours between Nov-Feb', true);
      break;
    case 'storm':
    case 'severe_weather':
      push(warning ? `Active official warning: ${warning.event} (${warning.severity})` : 'No active official severe-weather warning', !!warning);
      break;
    case 'hourly':
      push('Hourly profile built from the forecast diurnal cycle', true);
      break;
    case 'forecast_5':
      push('5-day outlook shows evolving temperature and rain trends', true);
      break;
    case 'forecast_7':
      push('7-day forecast is prioritized for travel planning', true);
      break;
    case 'destination':
      push(`Destination conditions from current observation (${w?.weatherCondition || 'n/a'})`, true);
      break;
    case 'commute':
      push(`Current conditions: ${w?.weatherCondition || 'n/a'}, ${temp ?? 'n/a'}°C`, true);
      push('Commute risk rises with rain probability, fog and severe warnings', rainProb > 40);
      break;
    case 'travel_insight':
      push('Travel insight combines forecast trend, rain probability and active warnings', true);
      break;
    case 'farm_insight':
      push('Farm insight derived from temperature, rainfall outlook and humidity', true);
      break;
    case 'sea_conditions':
      push('Real-time wave/tide data requires the IMD marine API key', false);
      push('Beach guidance uses wind and storm outlook', true);
      break;
    case 'aviation':
      push(`Visibility ${vis != null ? vis.toFixed(1) + ' km' : 'n/a'} and wind ${wind ?? 'n/a'} km/h for approach planning`, true);
      push('METAR/TAF feeds require the IMD thematic API key', false);
      break;
    case 'severe_alert':
      push(`Severity ${warning?.severity?.toUpperCase()}: safety information overrides normal personalization`, !!warning);
      break;
    case 'current':
    case 'generic':
      push('Overview of current observed conditions', true);
      break;
    default:
      break;
  }
  return factors;
}

export function personalize(
  weather: WeatherEnvelope | null,
  persona: PersonaId,
  personas: PersonaId[],
  requirements: string[],
  warningsOverride: Warning[] | null
): PersonalizationResult {
  const active = personas.length ? personas : [persona];
  const effectiveWarnings = warningsOverride && warningsOverride.length ? warningsOverride : weather?.warnings ?? [];
  const warning = topWarning(effectiveWarnings);
  const safetyActive = !!(warning && SEVERITY_RANK[warning.severity] >= SEVERITY_RANK.watch);

  let ordered = scoreOrder(active, requirements);
  if (safetyActive) ordered = [CARD_IDS.severe_alert, ...ordered.filter((c) => c !== CARD_IDS.severe_alert)];

  const cards: PriorityCard[] = ordered.map((id) => ({
    id,
    reason: weather ? whyFactors(id, weather, warning) : []
  }));

  const p = getPersona(persona);
  const locName = weather?.location ?? '';

  return {
    persona,
    personaLabel: p.label,
    greetingSuffix: PERSONA_GREETING[persona],
    safetyActive,
    topWarning: warning,
    priorityOrder: ordered,
    cards,
    insights: weather ? insightsFor(persona, weather, warning) : [],
    recommendation: buildRecommendation(persona, active, requirements, weather, warning, '', locName)
  };
}
/**
 * Rule-based Personalization Engine (server mirror of client/src/personalization).
 * Deterministic: same weather + profile => same priority ordering.
 * Scoring = per-persona widget weights + requirement boosts, averaged across
 * selected personas. Safety rule: a severe warning is always placed at
 * PRIORITY 0 above normal personalization.
 */
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
};

export const ALL_CARDS = [
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

export const PERSONA_WEIGHTS = {
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

export const REQUIREMENT_BOOSTS = {
  best_running_time: ['outdoor_window', 'hourly'],
  heat: ['temperature', 'outdoor_window'],
  uv: ['uv'],
  rain: ['rain', 'rain_risk'],
  wind: ['wind', 'storm'],
  humidity: ['humidity'],
  air_quality: ['air_quality'],
  sunrise_sunset: ['outdoor_window', 'generic'],
  rainfall: ['rainfall', 'rain', 'rain_risk'],
  temperature: ['temperature', 'current'],
  rain_timing: ['hourly', 'rain_risk', 'rainfall'],
  severe_weather: ['severe_weather', 'storm'],
  soil_conditions: ['field_work', 'farm_insight'],
  crop_planning: ['farm_insight', 'forecast_5'],
  field_work_time: ['field_work', 'hourly', 'outdoor_window'],
  visibility: ['visibility'],
  fog: ['fog'],
  storm: ['storm', 'severe_weather'],
  road_conditions: ['commute', 'rain_risk'],
  weather_warnings: ['severe_weather', 'storm'],
  airport_conditions: ['aviation', 'visibility'],
  metar_taf: ['aviation', 'wind', 'visibility'],
  cloud_ceiling: ['aviation', 'severe_weather'],
  destination_weather: ['destination'],
  multi_day_forecast: ['forecast_7', 'travel_insight'],
  travel_alerts: ['travel_insight', 'severe_weather'],
  rain_probability: ['rain', 'rain_risk'],
  outdoor_comfort: ['outdoor_window', 'temperature'],
  extended_forecast: ['forecast_7', 'forecast_5'],
  sea_conditions: ['sea_conditions'],
  tide: ['sea_conditions'],
  waves: ['sea_conditions'],
  water_conditions: ['sea_conditions'],
  coastal_warnings: ['sea_conditions', 'severe_weather'],
  frost: ['fog', 'temperature', 'field_work'],
  rainfall_forecast: ['rainfall', 'rain'],
  planting_conditions: ['farm_insight', 'field_work', 'temperature'],
  forecast: ['forecast_5', 'forecast_7'],
  aqi: ['air_quality'],
  commute_conditions: ['commute', 'hourly'],
  school_commute: ['commute', 'rain_risk']
};

const REQUIREMENT_BOOST = 18;

export const PERSONAS = {
  runner: { label: 'Runner', emoji: '🏃', description: 'Runner / Outdoor fitness' },
  farmer: { label: 'Farmer', emoji: '🌾', description: 'Farmer / Agriculture' },
  commuter: { label: 'Driver', emoji: '🚗', description: 'Driver / Commuter' },
  aviation: { label: 'Aviation', emoji: '✈️', description: 'Aviation / Pilot' },
  traveler: { label: 'Traveler', emoji: '🧳', description: 'Traveler' },
  family: { label: 'Family', emoji: '👨‍👩‍👧', description: 'Family / Parent' },
  event: { label: 'Event Planner', emoji: '🎪', description: 'Event Planner' },
  beach: { label: 'Beach / Surfer', emoji: '🏖️', description: 'Beachgoer / Surfer' },
  gardener: { label: 'Gardener', emoji: '🌱', description: 'Gardener' },
  general: { label: 'General', emoji: '👤', description: 'General user' },
  cyclist: { label: 'Cyclist', emoji: '🚴', description: 'Cyclist' },
  outdoor: { label: 'Outdoor Worker', emoji: '🏗️', description: 'Construction / Outdoor work' },
  student: { label: 'Student', emoji: '🎓', description: 'Student' },
  researcher: { label: 'Research', emoji: '🔬', description: 'Research / Weather enthusiast' }
};

const SEVERITY_RANK = { no_warning: 0, watch: 1, alert: 2, warning: 3 };

export function topWarning(warnings = []) {
  if (!warnings.length) return null;
  return warnings.reduce((a, b) => (SEVERITY_RANK[b.severity] > SEVERITY_RANK[a.severity] ? b : a), warnings[0]);
}

/** Scoring layer: weighted base + requirement boosts, averaged over personas. */
export function scoreOrder(personas = ['general'], requirements = []) {
  const boosts = {};
  for (const req of requirements) {
    for (const card of REQUIREMENT_BOOSTS[req] || []) boosts[card] = (boosts[card] || 0) + REQUIREMENT_BOOST;
  }
  const totals = {};
  for (const pid of personas) {
    const weights = PERSONA_WEIGHTS[pid] || {};
    for (const card of ALL_CARDS) {
      const boosted = Math.min(100, (weights[card] || 0) + (boosts[card] || 0));
      totals[card] = (totals[card] || 0) + boosted;
    }
  }
  const count = Math.max(1, personas.length);
  return ALL_CARDS.map((card) => ({ card, score: (totals[card] || 0) / count }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || ALL_CARDS.indexOf(a.card) - ALL_CARDS.indexOf(b.card))
    .map((c) => c.card);
}

export function whyFactors(cardId, weather, warning) {
  const w = weather?.current || {};
  const today = weather?.forecast?.[0] || {};
  const factors = [];
  const push = (text, ok) => factors.push({ text, ok });
  const temp = Number.isFinite(w.temperature) ? w.temperature : today.tMax;
  const rainProb = today.rainProb ?? 0;
  switch (cardId) {
    case 'outdoor_window':
      push(`Temperature of ${temp ?? 'n/a'}°C is within a comfortable outdoor band`, temp != null && temp >= 12 && temp <= 34);
      push(`Rain probability of ${rainProb}% is low enough for outdoor activity`, rainProb <= 40);
      push(`Wind ${Number.isFinite(w.windSpeed) ? w.windSpeed + ' km/h' : 'n/a'} is moderate`, !Number.isFinite(w.windSpeed) || w.windSpeed <= 25);
      push('Recommended window avoids peak heat and high UV hours', true);
      break;
    case 'temperature':
      push(`Current temperature is ${w.temperature ?? 'n/a'}°C, feels like ${w.feelsLike ?? 'n/a'}°C`, true);
      push('Feels-like is derived from temperature + humidity', true);
      break;
    case 'uv':
      push('UV index is not provided by the current IMD source', false);
      break;
    case 'wind':
      push(`Wind: ${w.windDirection || '--'} ${w.windSpeed ?? 'n/a'} km/h`, true);
      break;
    case 'humidity':
      push(`Relative humidity is ${w.humidity ?? 'n/a'}%`, Number.isFinite(w.humidity));
      push('High humidity raises the feels-like temperature', Number.isFinite(w.humidity) && w.humidity > 60);
      break;
    case 'air_quality':
      push('Air quality is not provided by the current IMD source', false);
      break;
    case 'rain':
    case 'rain_risk':
    case 'rainfall':
      push(`Rain probability today is ${rainProb}%`, true);
      push(`Expected rainfall ${today.rainfall ?? 0} mm`, (today.rainfall ?? 0) > 0);
      break;
    case 'field_work':
      push(`Today's rain probability is ${rainProb}% - dry windows favour field work`, rainProb <= 45);
      push('Temperature and humidity influence labour comfort', temp != null);
      break;
    case 'visibility':
      push(`Visibility ${w.visibility ?? 'n/a'} km (lower = higher risk)`, Number.isFinite(w.visibility) && Number(w.visibility) >= 2);
      break;
    case 'fog':
      push('Fog risk rises with humidity above 85% and calm winds', Number.isFinite(w.humidity) && w.humidity > 85);
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
      push('7-day forecast is prioritised for travel planning', true);
      break;
    case 'destination':
      push(`Destination conditions from current observation (${w.weatherCondition || 'n/a'})`, true);
      break;
    case 'commute':
      push(`Current conditions: ${w.weatherCondition || 'n/a'}, ${temp ?? 'n/a'}°C`, true);
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
      push(`Visibility ${Number.isFinite(w.visibility) ? w.visibility.toFixed(1) + ' km' : 'n/a'} and wind ${w.windSpeed ?? 'n/a'} km/h for approach planning`, true);
      push('METAR/TAF feeds require the IMD thematic API key', false);
      break;
    default:
      break;
  }
  return factors;
}

/** Deterministic insights (labelled "MAUSAM Insight"). */
export function insightsFor(personaId, weather, warning) {
  const w = weather?.current || {};
  const today = weather?.forecast?.[0] || {};
  const rainProb = today.rainProb ?? 0;
  const temp = Number.isFinite(w.temperature) ? w.temperature : today.tMax ?? NaN;
  const out = [];
  if (warning && SEVERITY_RANK[warning.severity] >= SEVERITY_RANK.watch) {
    out.push({ tone: 'severe', headline: 'Safety first - official warning active', text: `An official weather warning (${warning.event}) is in effect for ${warning.area || 'your area'}. Personal planning advice is shown below the safety information.`, basedOn: 'Official IMD warning bulletin.' });
  }
  if (personaId === 'runner') {
    out.push(rainProb <= 40 && temp >= 10 && temp <= 34
      ? { tone: 'positive', headline: 'Outdoor activity looks suitable', text: 'Temperature and rain conditions favour a run in the recommended window. Stay hydrated.', basedOn: 'Current forecast conditions.' }
      : temp > 34
        ? { tone: 'caution', headline: 'High heat conditions', text: 'Consider an earlier or later workout to avoid peak heat. Prefer shaded routes and hydration.', basedOn: 'Current forecast conditions.' }
        : { tone: 'caution', headline: 'Rain may interrupt outdoor plans', text: 'Keep a flexible window or an indoor alternative ready for today.', basedOn: 'Current forecast conditions.' });
  } else if (personaId === 'farmer') {
    out.push(rainProb > 45
      ? { tone: 'caution', headline: 'Rain expected - review outdoor field work', text: 'Plan field operations around the expected wet spell. Check IMD MeghDoot / agromet advisories for crop-specific guidance.', basedOn: 'Current forecast conditions.' }
      : temp > 40
        ? { tone: 'caution', headline: 'High temperature stress expected', text: 'Schedule irrigation early morning or evening. General weather note, not a crop prescription.', basedOn: 'Current forecast conditions.' }
        : { tone: 'positive', headline: 'Suitable window for field work', text: 'Dry conditions with moderate temperature favour outdoor farm operations today.', basedOn: 'Current forecast conditions.' });
  } else if (personaId === 'commuter') {
    out.push(rainProb > 45 || (warning && SEVERITY_RANK[warning.severity] >= SEVERITY_RANK.alert)
      ? { tone: 'caution', headline: 'Rain risk may affect commute', text: 'Carry rain protection, allow extra travel time and check live IMD alerts before leaving.', basedOn: 'Current forecast conditions.' }
      : { tone: 'positive', headline: 'Commute conditions look normal', text: 'Low rain risk and no active warnings for your route.', basedOn: 'Current forecast conditions.' });
  } else if (personaId === 'traveler') {
    out.push(warning
      ? { tone: 'caution', headline: 'Check active warnings before travel', text: 'A weather warning is in effect. Verify destination conditions and travel advisories before departure.', basedOn: 'Current forecast conditions.' }
      : { tone: 'positive', headline: 'Travel outlook is stable', text: 'No active warnings. Review the 7-day forecast for destination-specific details.', basedOn: 'Current forecast conditions.' });
  } else {
    out.push({ tone: 'neutral', headline: 'Typical conditions today', text: 'Review the 7-day forecast for the week ahead.', basedOn: 'Current forecast conditions.' });
  }
  return out;
}

/** Lightweight recommendation mirror (client renders the richer version). */
export function buildRecommendation(personaId, personas, weather, warning, location) {
  const w = weather?.current || {};
  const today = weather?.forecast?.[0] || {};
  const rainProb = today.rainProb ?? 0;
  const temp = Number.isFinite(w.temperature) ? w.temperature : today.tMax ?? 30;
  if (warning && SEVERITY_RANK[warning.severity] >= SEVERITY_RANK.watch) {
    return { headline: `Severe weather - ${warning.event}`, text: `An official warning is in effect for ${warning.area || 'your area'}. Personal planning advice appears below the safety information.`, window: 'Follow IMD advisories', bullets: [`Rain probability ${Math.round(rainProb)}%`, 'Official IMD warning active'], why: [], note: 'MAUSAM Insight - based on available weather data.' };
  }
  const bullets = [`Rain ${Math.round(rainProb)}%`, `Temp ${Math.round(temp)}°C`];
  return { headline: `Conditions for ${location}`, text: `Based on ${personas.map((p) => PERSONAS[p]?.label || p).join(' + ')} needs and the current weather data.`, window: 'Today', bullets, why: [], note: 'MAUSAM Insight - based on available weather data.' };
}

/** Core entry point. */
export function personalize(weather, personaId = 'general', opts = null) {
  const o = opts || {};
  const warningsOverride = Array.isArray(o) ? o : o.warnings ?? null;
  const personas = o.personas?.length ? o.personas : [personaId];
  const requirements = o.requirements || [];
  const persona = PERSONAS[personaId] || PERSONAS.general;
  const warning = warningsOverride && warningsOverride.length ? topWarning(warningsOverride) : topWarning(weather?.warnings || []);
  const safetyActive = !!(warning && SEVERITY_RANK[warning.severity] >= SEVERITY_RANK.watch);

  let ordered = scoreOrder(personas, requirements);
  if (safetyActive) ordered = [CARD_IDS.severe_alert, ...ordered.filter((c) => c !== CARD_IDS.severe_alert)];

  const cards = ordered.map((id) => ({ id, reason: whyFactors(id, weather, warning) }));
  return {
    persona: persona.id,
    personaLabel: persona.label,
    greetingSuffix: persona.label.toUpperCase(),
    safetyActive,
    topWarning: warning,
    priorityOrder: ordered,
    cards,
    insights: insightsFor(persona.id, weather, warning),
    recommendation: buildRecommendation(persona.id, personas, weather, warning, weather?.location || '')
  };
}
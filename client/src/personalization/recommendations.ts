import type { PersonaId, PersonalizedInsight, Insight, Warning, WeatherEnvelope, WhyFactor, Severity } from '../types';
import { getPersona } from '../data/personas';

const SEVERITY_RANK: Record<Severity, number> = { no_warning: 0, watch: 1, alert: 2, warning: 3 };

export { buildRecommendation, insightsFor };

function num(v: number | null | undefined): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function numOr(v: number | null | undefined, fallback: number): number {
  const n = num(v as number);
  return n == null ? fallback : n;
}

function conditions(weather: WeatherEnvelope | null) {
  const w = weather?.current ?? null;
  const today = weather?.forecast?.[0] ?? null;
  const rainProb = numOr(today?.rainProb, 0);
  const temp = numOr((w?.temperature as number) ?? today?.tMax, 30);
  const tmax = numOr(today?.tMax, temp);
  const feels = numOr(w?.feelsLike, temp);
  const wind = numOr(w?.windSpeed, 0);
  const hum = numOr(w?.humidity, 0);
  const vis = num(w?.visibility);
  const windDir = w?.windDirection || '--';
  return { w, today, rainProb, temp, tmax, feels, wind, hum, vis, windDir };
}

function baseWhy(personas: PersonaId[], location: string, cv: ReturnType<typeof conditions>, warn: Warning | null): WhyFactor[] {
  return [
    { text: `Your profile: ${personas.map((e) => getPersona(e).label).join(' + ')}`, ok: true },
    { text: `Current location: ${location}`, ok: true },
    { text: `Temperature: ${Math.round(cv.temp)}°C, feels like ${Math.round(cv.feels)}°C`, ok: true },
    { text: `Rain probability today: ${Math.round(cv.rainProb)}%`, ok: true },
    { text: `Wind: ${Math.round(cv.wind)} km/h · Humidity: ${Math.round(cv.hum)}%`, ok: true },
    { text: 'UV index is not available from the current IMD source', ok: false },
    { text: warn ? `Active warning: ${warn.event} (${warn.severity})` : 'Current warning status: No critical warning', ok: !!warn }
  ];
}

function buildRecommendation(
  personaId: PersonaId,
  personas: PersonaId[],
  _requirements: string[],
  weather: WeatherEnvelope | null,
  warning: Warning | null,
  _profileName: string,
  location: string
): PersonalizedInsight {
  const cv = conditions(weather);
  const warn = warning && SEVERITY_RANK[warning.severity] >= SEVERITY_RANK.watch;
  const note = 'MAUSAM Insight - based on the weather data available to MAUSAM. Not medical or crop-specific advice.';
  const base: PersonalizedInsight = { headline: '', text: '', window: '', bullets: [], why: baseWhy(personas, location, cv, warning), note };

  if (warn && warning) {
    base.headline = `Severe weather - ${warning.event}`;
    base.text = `An official warning is in effect for ${warning.area || 'your area'}. Personal planning advice appears below the safety information.`;
    base.window = 'Follow IMD advisories';
    base.bullets = [`Rain probability ${Math.round(cv.rainProb)}%`, `Wind ${Math.round(cv.wind)} km/h`, 'Official IMD warning active'];
    return base;
  }

  const bullets = [`Rain ${Math.round(cv.rainProb)}%`, `Max ${Math.round(cv.tmax)}°C`, `Wind ${Math.round(cv.wind)} km/h`];

  switch (personaId) {
    case 'runner':
      if (cv.rainProb <= 40 && cv.temp >= 10 && cv.temp <= 34) {
        base.headline = 'Good conditions for an early run';
        base.window = '6:00 AM - 8:00 AM';
        base.text = `With ${Math.round(cv.temp)}°C and ${Math.round(cv.rainProb)}% rain probability, the morning window has the most pleasant heat and lower UV.`;
        base.bullets = [`Lower heat · ${Math.round(cv.temp)}°C`, `Rain chance ${Math.round(cv.rainProb)}%`, `Wind ${Math.round(cv.wind)} km/h`, 'UV not available from current source'];
      } else if (cv.rainProb > 40) {
        base.headline = 'Rain may interrupt outdoor plans';
        base.window = 'Flexible / indoor alternative';
        base.text = `Rain probability is ${Math.round(cv.rainProb)}%. Prefer a flexible window or an indoor workout.`;
        base.bullets = [...bullets];
      } else {
        base.headline = 'High heat - pick the cooler hours';
        base.window = '5:00 AM - 7:00 AM or after 6:00 PM';
        base.text = `Temperature reaches ${Math.round(cv.tmax)}°C today. Shaded routes and hydration help; schedule around peak heat.`;
        base.bullets = [...bullets];
      }
      break;
    case 'farmer':
      if (cv.rainProb > 45) {
        base.headline = 'Rain expected - plan field work for the morning';
        base.window = 'Morning field window';
        base.text = `Rain probability is ${Math.round(cv.rainProb)}%. Based on the forecast, morning field work before the wet spell is preferable.`;
        base.bullets = [`Rain ${Math.round(cv.rainProb)}%`, `Max ${Math.round(cv.tmax)}°C`, `Humidity ${Math.round(cv.hum)}%`];
      } else if (cv.temp > 40) {
        base.headline = 'High heat stress expected';
        base.window = 'Early morning / evening';
        base.text = `Temperatures near ${Math.round(cv.temp)}°C. Schedule labour and irrigation for the cooler hours.`;
        base.bullets = [...bullets];
      } else {
        base.headline = 'Dry conditions favour field work';
        base.window = 'Today';
        base.text = `Dry moderate conditions (${Math.round(cv.temp)}°C, ${Math.round(cv.rainProb)}% rain) support outdoor farm operations.`;
        base.bullets = [`Rain ${Math.round(cv.rainProb)}%`, `Max ${Math.round(cv.tmax)}°C`, `Humidity ${Math.round(cv.hum)}%`];
      }
      break;
    case 'commuter':
      if (cv.rainProb > 45) {
        base.headline = 'Rain risk during your commute window';
        base.window = 'Allow extra travel time';
        base.text = `Rain probability is ${Math.round(cv.rainProb)}%. Check live IMD alerts and keep extra travel time before leaving.`;
        base.bullets = [`Rain ${Math.round(cv.rainProb)}%`, `Visibility ${cv.vis != null ? cv.vis.toFixed(1) : 'n/a'} km`, `Wind ${Math.round(cv.wind)} km/h`];
      } else {
        base.headline = 'Commute conditions look normal';
        base.window = 'Usual commute';
        base.text = `Low rain risk (${Math.round(cv.rainProb)}%) and no active warnings for ${location}.`;
        base.bullets = [...bullets];
      }
      break;
    case 'aviation':
      base.headline = 'Aviation brief - wind & visibility';
      base.window = 'Current observations';
      base.text = `Wind ${Math.round(cv.wind)} km/h (${cv.windDir}) and visibility ${cv.vis != null ? cv.vis.toFixed(1) + ' km' : 'not available from current source'}. Cross-check METAR/TAF when planning.`;
      base.bullets = [`Wind ${Math.round(cv.wind)} km/h`, `Visibility ${cv.vis != null ? cv.vis.toFixed(1) + ' km' : 'n/a'}`, `Rain ${Math.round(cv.rainProb)}%`, 'Cloud/ceiling data needs IMD API key'];
      break;
    case 'traveler':
      base.headline = warn ? 'Travel - check warnings first' : 'Travel outlook is stable';
      base.window = warn ? 'Before departure' : `Destination: ${location}`;
      base.text = warn
        ? 'A weather warning is in effect. Verify destination conditions before travel.'
        : `No active warnings. ${Math.round(cv.rainProb)}% rain today - review the 7-day forecast for destination details.`;
      base.bullets = [...bullets];
      break;
    case 'family':
      base.headline = cv.rainProb > 45 ? 'Plan outdoor plans around rain' : 'Good day for family outdoor plans';
      base.text =
        cv.rainProb > 45
          ? `${Math.round(cv.rainProb)}% rain today - school commutes and outings may need rain cover.`
          : `Mild conditions (${Math.round(cv.temp)}°C, ${Math.round(cv.rainProb)}% rain) suit most outdoor family activities.`;
      base.bullets = [`Rain ${Math.round(cv.rainProb)}%`, `Temp ${Math.round(cv.temp)}°C`, `Humidity ${Math.round(cv.hum)}%`];
      break;
    case 'event':
      base.headline = cv.rainProb > 50 ? 'Rain risk - plan an indoor backup' : 'Event window looks workable';
      base.text =
        cv.rainProb > 50
          ? `${Math.round(cv.rainProb)}% rain probability. Have a covered/indoor backup ready for the event.`
          : `${Math.round(cv.rainProb)}% rain, ${Math.round(cv.wind)} km/h wind - comfortable for an open-air event today.`;
      base.bullets = [...bullets];
      break;
    case 'beach':
      base.headline = 'Beach conditions - coast outlook';
      base.text = `Wind ${Math.round(cv.wind)} km/h today. Real-time wave/tide data needs the IMD marine API (not available from the current source).`;
      base.bullets = [`Wind ${Math.round(cv.wind)} km/h`, `Temp ${Math.round(cv.temp)}°C`, 'UV not available from current source', 'Waves/tides: IMD marine API'];
      break;
    case 'gardener':
      base.headline = cv.rainProb > 45 ? 'Rain expected - hold off watering' : 'Good conditions for planting/watering';
      base.text =
        cv.rainProb > 45
          ? `${Math.round(cv.rainProb)}% rain likelihood. Avoid over-watering today and check frost criteria in cooler hours.`
          : `Dry moderate conditions (${Math.round(cv.temp)}°C) favour planting and watering.`;
      base.bullets = [`Rain ${Math.round(cv.rainProb)}%`, `Temp ${Math.round(cv.temp)}°C`, `Humidity ${Math.round(cv.hum)}%`];
      break;
    case 'cyclist':
      base.headline = cv.rainProb <= 40 && cv.wind <= 25 ? 'Cycling conditions look good' : 'Check wind and rain before riding';
      base.text =
        cv.rainProb <= 40 && cv.wind <= 25
          ? `Low rain (${Math.round(cv.rainProb)}%) and moderate wind (${Math.round(cv.wind)} km/h) - a comfortable riding window today.`
          : `Rain ${Math.round(cv.rainProb)}% with wind ${Math.round(cv.wind)} km/h - ride with care or plan around conditions.`;
      base.bullets = [...bullets];
      break;
    case 'outdoor':
      if (cv.temp > 38) {
        base.headline = `High heat - limit outdoor exposure at peak hours (${Math.round(cv.temp)}°C)`;
        base.window = 'Cooler morning / evening windows';
        base.text = 'Hydrate, shade and rotate outdoor tasks to the cooler windows.';
      } else if (cv.rainProb > 45) {
        base.headline = 'Rain expected during work hours';
        base.window = 'Morning window preferable';
        base.text = `Rain probability of ${Math.round(cv.rainProb)}% - schedule exposed tasks earlier.`;
      } else {
        base.headline = `Manageable weather for outdoor work (${Math.round(cv.temp)}°C)`;
        base.window = 'Work day';
        base.text = `Rain ${Math.round(cv.rainProb)}%, wind ${Math.round(cv.wind)} km/h - standard precautions apply.`;
      }
      base.bullets = [...bullets];
      break;
    case 'student':
      base.headline = cv.rainProb > 45 ? 'Rain on the school route today' : 'School commute looks clear';
      base.text =
        cv.rainProb > 45
          ? `Rain probability ${Math.round(cv.rainProb)}% - pack a rain cover for the commute.`
          : `Clear conditions (${Math.round(cv.temp)}°C) for the commute; UV data not available from current source.`;
      base.bullets = [`Rain ${Math.round(cv.rainProb)}%`, `Temp ${Math.round(cv.temp)}°C`, `Wind ${Math.round(cv.wind)} km/h`];
      break;
    case 'researcher':
      base.headline = `Observed snapshot for ${location}`;
      base.window = 'Current observations';
      base.text = `Temp ${Math.round(cv.temp)}°C (${Math.round(cv.tmax)}°C max), rain ${Math.round(cv.rainProb)}%, wind ${Math.round(cv.wind)} km/h, RH ${Math.round(cv.hum)}%. Full nautical/airport feeds need the IMD API key.`;
      base.bullets = [...bullets];
      break;
    default:
      base.headline = `Weather summary for ${location}`;
      base.window = 'Today';
      base.text = `Current ${Math.round(cv.temp)}°C, rain probability ${Math.round(cv.rainProb)}%.`;
      base.bullets = [...bullets];
      break;
  }
  return base;
}

function insightsFor(personaId: PersonaId, weather: WeatherEnvelope | null, warning: Warning | null): Insight[] {
  const cv = conditions(weather);
  const out: Insight[] = [];

  if (warning && SEVERITY_RANK[warning.severity] >= SEVERITY_RANK.watch) {
    out.push({
      tone: 'severe',
      headline: 'Safety first - official warning active',
      text: `An official weather warning (${warning.event}) is in effect for ${warning.area || 'your area'}. Personal planning advice is shown below the safety information.`,
      basedOn: 'Official IMD warning bulletin.'
    });
  }

  const common = {
    runner: cv.rainProb <= 40 && cv.temp >= 10 && cv.temp <= 34
      ? { tone: 'positive' as const, headline: 'Outdoor activity looks suitable', text: 'Temperature and rain conditions favour a run in the recommended window. Stay hydrated.' }
      : cv.temp > 34
      ? { tone: 'caution' as const, headline: 'High heat conditions', text: 'Consider an earlier or later workout to avoid peak heat.' }
      : { tone: 'caution' as const, headline: 'Rain may interrupt outdoor plans', text: 'Keep a flexible window or an indoor alternative ready for today.' },
    farmer: cv.rainProb > 45
      ? { tone: 'caution' as const, headline: 'Rain expected - review outdoor field work', text: 'Plan field operations around the expected wet spell. Check IMD MeghDoot/agromet advisories for crop-specific guidance.' }
      : cv.temp > 40
      ? { tone: 'caution' as const, headline: 'High temperature stress expected', text: 'Schedule irrigation for early morning or evening. General weather note, not a crop prescription.' }
      : { tone: 'positive' as const, headline: 'Suitable window for field work', text: 'Dry conditions with moderate temperature favour outdoor farm operations today.' },
    commuter: cv.rainProb > 45
      ? { tone: 'caution' as const, headline: 'Rain risk may affect commute', text: 'Carry rain protection, allow extra travel time and check live IMD alerts before leaving.' }
      : { tone: 'positive' as const, headline: 'Commute conditions look normal', text: 'Low rain risk and no active warnings for your route.' },
    traveler: warning
      ? { tone: 'caution' as const, headline: 'Check active warnings before travel', text: 'A weather warning is in effect. Verify destination conditions and travel advisories before departure.' }
      : { tone: 'positive' as const, headline: 'Travel outlook is stable', text: 'No active warnings. Review the 7-day forecast for destination-specific details.' }
  } as Record<string, { tone: Insight['tone']; headline: string; text: string }>;

  const defaultInsight: { tone: Insight['tone']; headline: string; text: string } = {
    tone: 'neutral',
    headline: 'Typical conditions today',
    text: 'Review the 7-day forecast for the week ahead.'
  };

  const hit = common[personaId] ?? defaultInsight;
  out.push({ ...hit, basedOn: 'Based on current forecast conditions.' });
  return out;
}
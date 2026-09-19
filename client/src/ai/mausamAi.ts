import type {
  CurrentWeather,
  ForecastDay,
  PersonaId,
  PersonalizationResult,
  Warning,
  WeatherEnvelope
} from '../types';
import { personalize, SEVERITY_RANK, topWarning } from '../personalization/engine';
import { getPersona } from '../data/personas';
import { effectiveWarnings } from '../context/AppContext';

export type AiIntent =
  | 'greeting'
  | 'best_time'
  | 'rain_today'
  | 'rain_tomorrow'
  | 'forecast_today'
  | 'forecast_week'
  | 'current_conditions'
  | 'uv'
  | 'wind'
  | 'visibility'
  | 'air_quality'
  | 'commute'
  | 'field_work'
  | 'aviation'
  | 'beach'
  | 'warnings_any'
  | 'explain_warning'
  | 'why'
  | 'help';

export interface MausamAiContext {
  userName: string;
  persona: PersonaId;
  personas: PersonaId[];
  requirements: string[];
  locationId: string;
  locationLabel: string;
  current: CurrentWeather | null;
  today: ForecastDay | null;
  tomorrow: ForecastDay | null;
  forecast: ForecastDay[];
  warnings: Warning[];
  topWarning: Warning | null;
  safetyActive: boolean;
  nowcount: number;
  dataMode: WeatherEnvelope['meta']['dataMode'] | null;
  result: PersonalizationResult;
}

export interface AiAnswer {
  intent: AiIntent;
  text: string;
  basis: string[];
}

const num = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const round = (v: number | null | undefined): string => {
  const n = num(v);
  return n == null ? 'n/a' : String(Math.round(n));
};

export function buildMausamAiContext(opts: {
  weather: WeatherEnvelope | null;
  name: string;
  persona: PersonaId;
  personas: PersonaId[];
  requirements: string[];
  locationId: string;
  locationLabel: string;
  demoMode: boolean;
  severeSim: boolean;
}): MausamAiContext {
  const w = opts.weather;
  const warnings = effectiveWarnings(w?.warnings ?? [], opts.demoMode, opts.severeSim, opts.locationLabel);
  const warning = topWarning(warnings);
  const safetyActive = !!(warning && SEVERITY_RANK[warning.severity] >= SEVERITY_RANK.watch);
  const result = personalize(w, opts.persona, opts.personas, opts.requirements, warnings);
  return {
    userName: opts.name || getPersona(opts.persona).label,
    persona: opts.persona,
    personas: opts.personas.length ? opts.personas : [opts.persona],
    requirements: opts.requirements,
    locationId: opts.locationId,
    locationLabel: opts.locationLabel,
    current: w?.current ?? null,
    today: w?.forecast?.[0] ?? null,
    tomorrow: w?.forecast?.[1] ?? null,
    forecast: w?.forecast ?? [],
    warnings,
    topWarning: warning,
    safetyActive,
    nowcount: w?.nowcast?.length ?? 0,
    dataMode: w?.meta?.dataMode ?? null,
    result
  };
}

function demoNote(w: Warning): string {
  return w.source === 'demo-simulation'
    ? `(DEMO scenario - this is a simulated warning, not an official IMD bulletin)`
    : `Source: India Meteorological Department`;
}

function fmtWind(c: CurrentWeather | null): string {
  if (!c) return 'Wind: n/a';
  const s = num(c.windSpeed);
  return `Wind: ${s == null ? 'n/a' : round(s) + ' km/h'}${c.windDirection ? ' (' + c.windDirection + ')' : ''}`;
}

const NONE = 'I don\'t have that information from the current weather source.';

export function answerIntent(intent: AiIntent, ctx: MausamAiContext): AiAnswer {
  const { current, today, tomorrow, warnings, topWarning, safetyActive, result } = ctx;
  const rainProb = num(today?.rainProb) ?? 0;
  const temp = num(current?.temperature) ?? num(today?.tMax);
  const feels = num(current?.feelsLike);
  const hum = num(current?.humidity);
  const vis = num(current?.visibility);
  const tmax = num(today?.tMax);
  const tmin = num(today?.tMin);

  const profileLine = () =>
    `You're viewing MAUSAM as ${ctx.personas.map((p) => getPersona(p).label).join(' + ')} for ${ctx.locationLabel}.`;
  const warningLine = () =>
    topWarning
      ? `${topWarning.event} (${topWarning.severity.toUpperCase()}) for ${topWarning.area || ctx.locationLabel}. ${demoNote(topWarning)}`
      : `No official warning is active for ${ctx.locationLabel}.`;

  switch (intent) {
    case 'greeting': {
      const lines: string[] = [];
      lines.push(`${result.recommendation.headline || `Today's weather at a glance`}.`);
      lines.push(profileLine());
      if (safetyActive && topWarning) lines.push(`⚠️ Safety first: ${topWarning.event} (${topWarning.severity.toUpperCase()}).`);
      lines.push(`${result.recommendation.text}`);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.forecast', 'ai.basis.current', 'ai.basis.profile', 'ai.basis.warnings'] };
    }

    case 'best_time': {
      const wnd = result.recommendation.window;
      const lines: string[] = [];
      lines.push(
        `Based on the current forecast${wnd ? ', the recommended window is **' + wnd + '**' : ''}.`
      );
      lines.push(
        `Temperature: ${temp == null ? 'n/a' : round(temp) + '°C'} · Rain probability: ${round(rainProb)}% · ${fmtWind(current)}` +
          (hum != null ? ` · Humidity: ${round(hum)}%` : '')
      );
      lines.push(`UV: ${NONE}`);
      lines.push('Conditions can change - always check the latest forecast before heading out.');
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.requirements', 'ai.basis.forecast', 'ai.basis.current'] };
    }

    case 'rain_today': {
      const lines: string[] = [];
      if (rainProb > 50) {
        lines.push(`Rain is likely today (${round(rainProb)}% chance).`);
        lines.push(
          `Rainfall expected: ${today?.rainfall != null ? round(today.rainfall) + ' mm' : NONE.replace('.', '')}.`
        );
        lines.push('Plan a rain cover for outdoor plans and check MAUSAM alerts for updates.');
      } else if (rainProb > 20) {
        lines.push(`A rain chance of ${round(rainProb)}% exists today - carry light protection.`);
      } else {
        lines.push(`Rain probability today is low (${round(rainProb)}%).`);
      }
      if (safetyActive && topWarning) lines.push(`⚠️ ${warningLine()}`);
      lines.push(`Source: ${today ? 'our forecast source' : NONE.replace('.', '')}.`);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings'] };
    }

    case 'rain_tomorrow': {
      if (!tomorrow) {
        return { intent, text: `I don't have a tomorrow forecast ${NONE.toLowerCase().replace('i don\'t have that information ', '')}.`, basis: ['ai.basis.forecast'] };
      }
      const rp = num(tomorrow.rainProb) ?? 0;
      const lines = [
        `Tomorrow (${tomorrow.weekday}): rain probability ${round(rp)}%.`,
        `Expected ${tomorrow.condition || 'conditions'}, max ${round(tomorrow.tMax)}°C / min ${round(tomorrow.tMin)}°C.`
      ];
      if (rp > 50) lines.push('Keep rain protection ready for tomorrow.');
      return { intent, text: lines.join('\n'), basis: ['ai.basis.forecast'] };
    }

    case 'forecast_today': {
      const lines: string[] = [];
      if (!today) {
        lines.push(NONE);
        lines.push('The 5-day forecast needs the IMD forecast feed, which is not available from the current source.');
      } else {
        lines.push(
          `${today.weekday} · ${today.condition || 'forecast available'}\nMax ${round(tmax)}°C / Min ${round(tmin)}°C · Rain ${round(rainProb)}%`
        );
        if (hum != null) lines.push(`Humidity: ${round(hum)}%`);
      }
      if (safetyActive && topWarning) lines.push(`⚠️ ${warningLine()}`);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings'] };
    }

    case 'forecast_week': {
      const lines: string[] = [];
      if (!ctx.forecast.length) {
        lines.push(NONE);
        lines.push('The multi-day forecast is not available from the current weather source.');
      } else {
        ctx.forecast.slice(0, 5).forEach((d) => {
          lines.push(`${d.weekday}: ${d.condition || '--'} · ${round(d.tMax)}°/${round(d.tMin)}° · rain ${round(d.rainProb)}%`);
        });
        lines.push('This is the outlook MAUSAM currently receives; check IMD for a formal forecast.');
      }
      return { intent, text: lines.join('\n'), basis: ['ai.basis.forecast'] };
    }

    case 'current_conditions': {
      if (!current) {
        return { intent, text: NONE + '\nNo current observation is available for this location from the current source.', basis: ['ai.basis.current'] };
      }
      const lines = [
        `At ${ctx.locationLabel}: ${current.weatherCondition || 'conditions observed'}, ${round(current.temperature)}°C${feels != null ? ` (feels like ${round(feels)}°C)` : ''}.`,
        `${fmtWind(current)}`,
        `Humidity: ${hum != null ? round(hum) + '%' : 'n/a'} · Visibility: ${vis != null ? vis.toFixed(1) + ' km' : 'n/a'}`,
        `Rain probability today: ${round(rainProb)}%`
      ];
      if (safetyActive && topWarning) lines.push(`⚠️ ${warningLine()}`);
      lines.push(`Source: ${ctx.dataMode === 'fallback' || ctx.dataMode === 'demo' ? 'MAUSAM simulator (clearly labelled) - live IMD observation not available for this location' : 'IMD'}.`);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.current', 'ai.basis.location'] };
    }

    case 'uv':
      return {
        intent,
        text: `UV index ${NONE}`,
        basis: ['ai.basis.current']
      };

    case 'wind': {
      const ws = num(current?.windSpeed);
      return {
        intent,
        text: `${fmtWind(current)}${ws == null ? '\n' + NONE : ` \u00b7 affects outdoor comfort and commute today.`}`,
        basis: ['ai.basis.current']
      };
    }

    case 'visibility': {
      const vs = num(current?.visibility);
      return {
        intent,
        text: `Visibility ${vs != null ? vs.toFixed(1) + ' km' : NONE.toLowerCase().replace('i don\'t have that information ', 'not available')}${vs != null && vs < 2 ? ' - low visibility, drive with care.' : vs != null ? ' - within typical range.' : ''}`,
        basis: ['ai.basis.current']
      };
    }

    case 'air_quality':
      return {
        intent,
        text: `Air quality ${NONE}.\nAQI needs a thematic data source which is not available from the current IMD source.`,
        basis: ['ai.basis.current']
      };

    case 'commute': {
      const lines: string[] = [];
      lines.push(
        `Current conditions for your commute: ${current?.weatherCondition || 'n/a'}, ${temp == null ? 'n/a' : round(temp) + '°C'}.`
      );
      lines.push(`Rain probability ${round(rainProb)}%${vis != null ? ` · Visibility ${vis.toFixed(1)} km` : ''}.`);
      if (rainProb > 40) lines.push('Rain risk is elevated for the commute window - allow extra travel time.');
      if (ctx.nowcount > 0) lines.push(`I also checked the available nowcast bulletins (${ctx.nowcount} issued for the area).`);
      lines.push(`Warnings: ${warningLine()}`);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings'] };
    }

    case 'field_work': {
      const lines: string[] = [];
      if (rainProb > 45) {
        lines.push(`Based on the available forecast, rainfall is expected (${round(rainProb)}% probability).`);
        lines.push('You may want to review outdoor field work plans accordingly.');
      } else if ((temp ?? 99) > 40) {
        lines.push(`High heat expected (${round(temp)}°C) - schedule labour for early morning or evening.`);
      } else {
        lines.push(`Moderate conditions (${round(temp)}°C, ${round(rainProb)}% rain) - field work looks workable today.`);
      }
      lines.push('This is a general weather note from MAUSAM, not crop or soil advice. Check IMD Agromet (MeghDoot) advisories for crop-specific guidance.');
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.requirements', 'ai.basis.current', 'ai.basis.forecast'] };
    }

    case 'aviation': {
      const windSpd = num(current?.windSpeed);
      const lines: string[] = [
        'Current available aviation-relevant information:',
        `\u2022 Wind: ${windSpd == null ? 'n/a' : round(windSpd) + ' km/h'}${current?.windDirection ? ' (' + current.windDirection + ')' : ''}`,
        `\u2022 Visibility: ${vis != null ? vis.toFixed(1) + ' km' : 'n/a'}`,
        `\u2022 ${warningLine()}`
      ];
      lines.push('For operational aviation decisions, always use official aviation weather sources (METAR/TAF via IMD) - those feeds are not available from the current source.');
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.current', 'ai.basis.warnings'] };
    }

    case 'beach': {
      const windSpd = num(current?.windSpeed);
      const lines: string[] = [
        `Beach outlook: wind ${windSpd == null ? 'n/a' : round(windSpd) + ' km/h'}, temperature ${temp == null ? 'n/a' : round(temp) + '°C'}.`
      ];
      lines.push('Real-time wave/tide data needs the IMD marine API (not available from the current source) - beach guidance uses wind and storm outlook only.');
      if (safetyActive && topWarning) lines.push(`⚠️ ${warningLine()}`);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.current', 'ai.basis.warnings'] };
    }

    case 'warnings_any': {
      const lines: string[] = [];
      if (safetyActive && topWarning) {
        lines.push(warningLine());
        lines.push('Personalized insights move below this safety information.');
      } else {
        lines.push(`No active official warning for ${ctx.locationLabel}.`);
        if (ctx.nowcount > 0) lines.push(`I also checked the available nowcast bulletins (${ctx.nowcount} issued).`);
        else lines.push(`No nowcast bulletins are available from the current source.`);
      }
      return { intent, text: lines.join('\n'), basis: ['ai.basis.warnings'] };
    }

    case 'explain_warning': {
      if (!topWarning) {
        return thisIntent('warnings_any', ctx);
      }
      const lines: string[] = [
        `🚨 ${topWarning.event}`,
        `Severity: ${topWarning.severity.toUpperCase()} · Area: ${topWarning.area || ctx.locationLabel}`,
        `Valid from ${new Date(topWarning.validFrom).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} to ${new Date(topWarning.validUntil).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.`
      ];
      if (topWarning.detail) lines.push(topWarning.detail);
      lines.push(demoNote(topWarning));
      lines.push('This official information always takes priority over personalized recommendations.');
      return { intent, text: lines.join('\n'), basis: ['ai.basis.warnings'] };
    }

    case 'why': {
      const why = result.recommendation.why.slice(0, 4);
      const lines: string[] = [
        'Here is why MAUSAM answers this way:',
        ...why.map((r) => `${r.ok ? '✓' : '·'} ${r.text}`),
        'I only reuse data the app already shows you - I do not invent temperature, rainfall, AQI, warnings, UV or wind.'
      ];
      return {
        intent,
        text: lines.join('\n'),
        basis: ['ai.basis.profile', 'ai.basis.requirements', 'ai.basis.location', 'ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings', 'ai.basis.engine']
      };
    }

    case 'help':
    default: {
      const lines: string[] = [
        "I'm MAUSAM AI - the weather intelligence assistant for this app.",
        'I answer only from the actual weather data MAUSAM shows you (IMD where live, otherwise clearly-labelled simulated data). I\'m not a general chatbot.',
        'Try one of the suggested questions below, or ask about warnings, rain, wind, forecast or your commute.'
      ];
      return { intent: 'help', text: lines.join('\n'), basis: ['ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings'] };
    }
  }
}

function thisIntent(i: AiIntent, ctx: MausamAiContext): AiAnswer {
  return answerIntent(i, ctx);
}

/** Persona-aware quick questions. */
export const QUICK_QUESTIONS: Record<PersonaId, AiIntent[]> = {
  runner: ['best_time', 'rain_today', 'uv', 'wind'],
  farmer: ['rain_today', 'rain_tomorrow', 'warnings_any', 'forecast_today'],
  commuter: ['commute', 'rain_today', 'warnings_any', 'visibility'],
  aviation: ['aviation', 'wind', 'warnings_any', 'visibility'],
  traveler: ['rain_tomorrow', 'rain_today', 'warnings_any', 'forecast_week'],
  family: ['rain_today', 'warnings_any', 'best_time', 'forecast_today'],
  event: ['rain_today', 'best_time', 'warnings_any', 'forecast_week'],
  beach: ['beach', 'wind', 'warnings_any', 'rain_today'],
  gardener: ['field_work', 'rain_today', 'rain_tomorrow', 'forecast_today'],
  general: ['current_conditions', 'rain_today', 'forecast_today', 'warnings_any'],
  cyclist: ['best_time', 'wind', 'rain_today', 'warnings_any'],
  outdoor: ['best_time', 'rain_today', 'warnings_any', 'uv'],
  student: ['commute', 'rain_today', 'warnings_any', 'forecast_today'],
  researcher: ['current_conditions', 'forecast_week', 'warnings_any', 'aviation']
};

export const INTENT_LABEL_KEY: Record<AiIntent, string> = {
  greeting: 'ai.q.weather',
  best_time: 'ai.q.best',
  rain_today: 'ai.q.rain',
  rain_tomorrow: 'ai.q.tomorrow',
  forecast_today: 'ai.q.forecast',
  forecast_week: 'ai.q.week',
  current_conditions: 'ai.q.current',
  uv: 'ai.q.uv',
  wind: 'ai.q.wind',
  visibility: 'ai.q.visibility',
  air_quality: 'ai.q.air',
  commute: 'ai.q.commute',
  field_work: 'ai.q.field',
  aviation: 'ai.q.aviation',
  beach: 'ai.q.beach',
  warnings_any: 'ai.q.warnings',
  explain_warning: 'ai.q.warnings',
  why: 'ai.q.why',
  help: 'ai.q.help'
};

export function intentFromText(raw: string): AiIntent {
  const s = raw.toLowerCase();
  if (/\b(warn|alert|warning)\b/.test(s)) return 'warnings_any';
  if (/\bwhy\b/.test(s)) return 'why';
  if (/\b(tomorrow)\b/.test(s) && /\b(rain|wet|shower)\b/.test(s)) return 'rain_tomorrow';
  if (/\b(5.day|week|next days|7.day|outlook)\b/.test(s) && /\b(forecast|weather|rain)\b/.test(s)) return 'forecast_week';
  if (/\b(forecast|predict)\b/.test(s) || (/\b(today)\b/.test(s) && /\b(weather)\b/.test(s))) return 'forecast_today';
  if (/\b(best|window|run|outdoor|time to)\b/.test(s)) return 'best_time';
  if (/\b(uv|sunburn)\b/.test(s)) return 'uv';
  if (/\b(wind|windy|gust)\b/.test(s)) return 'wind';
  if (/\b(visibility|fog)\b/.test(s)) return 'visibility';
  if (/\b(air|aqi|pollution|quality)\b/.test(s)) return 'air_quality';
  if (/\b(commute|traffic|drive|route|road)\b/.test(s)) return 'commute';
  if (/\b(field|farm|plant|water|crop)\b/.test(s)) return 'field_work';
  if (/\b(flight|airport|aviation|pilot|metar)\b/.test(s)) return 'aviation';
  if (/\b(beach|sea|wave|coast|tide)\b/.test(s)) return 'beach';
  if (/\b(current|now|conditions)\b/.test(s)) return 'current_conditions';
  if (/^(hi|hello|hey|namaste|good)/.test(s)) return 'greeting';
  return 'help';
}
import type {
  CurrentWeather,
  ForecastDay,
  Language,
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
  language: Language;
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

type TDict = (key: string) => string;

const DATE_LOCALE: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN', pa: 'pa-IN' };

const num = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const round = (v: number | null | undefined): string => {
  const n = num(v);
  return n == null ? 'n/a' : String(Math.round(n));
};

export function buildMausamAiContext(opts: {
  weather: WeatherEnvelope | null;
  language: Language;
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
    language: opts.language,
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

/** Fills {placeholders} in a localized template string. */
function fill(t: TDict, key: string, vars?: Record<string, string>): string {
  const tmpl = t(key);
  return vars ? tmpl.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`) : tmpl;
}

const isFallbackMode = (mode: MausamAiContext['dataMode']): boolean => mode === 'fallback' || mode === 'demo';

function warningNote(t: TDict, w: Warning): string {
  return w.source === 'demo-simulation' ? t('ai.ans.demoNote') : t('ai.ans.demoSource');
}

function fmtWind(t: TDict, c: CurrentWeather | null): string {
  if (!c) return t('ai.ans.noWind');
  const s = num(c.windSpeed);
  if (s == null) return t('ai.ans.noWind');
  return c.windDirection
    ? fill(t, 'ai.ans.windFmtDir', { speed: round(s), dir: c.windDirection })
    : fill(t, 'ai.ans.windFmt', { speed: round(s) });
}

const personaLabels = (ctx: MausamAiContext, t: TDict): string => ctx.personas.map((p) => t('persona.' + p)).join(' + ');

function fmtWhen(ctx: MausamAiContext, iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(DATE_LOCALE[ctx.language], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function answerIntent(intent: AiIntent, ctx: MausamAiContext, t: TDict): AiAnswer {
  const { current, today, tomorrow, topWarning, safetyActive, result } = ctx;
  const rainProb = num(today?.rainProb) ?? 0;
  const temp = num(current?.temperature) ?? num(today?.tMax);
  const feels = num(current?.feelsLike);
  const hum = num(current?.humidity);
  const vis = num(current?.visibility);
  const tmax = num(today?.tMax);
  const tmin = num(today?.tMin);
  const evs = (v: number | null | undefined): string => (v == null ? t('ai.ans.na') : round(v));

  const profileLine = () => fill(t, 'ai.ans.profileLine', { personas: personaLabels(ctx, t), location: ctx.locationLabel });
  const warningLine = () =>
    topWarning
      ? fill(t, 'ai.ans.warningLine', {
          event: topWarning.event,
          severity: topWarning.severity.toUpperCase(),
          area: topWarning.area || ctx.locationLabel,
          note: warningNote(t, topWarning)
        })
      : fill(t, 'ai.ans.noWarning', { location: ctx.locationLabel });

  switch (intent) {
    case 'greeting': {
      const lines: string[] = [];
      lines.push(`${result.recommendation.headline || t('ai.ans.greeting.atGlance')}.`);
      lines.push(profileLine());
      if (safetyActive && topWarning) lines.push(fill(t, 'ai.ans.safetyFirst', { event: topWarning.event, severity: topWarning.severity.toUpperCase() }));
      lines.push(result.recommendation.text);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.forecast', 'ai.basis.current', 'ai.basis.profile', 'ai.basis.warnings'] };
    }

    case 'best_time': {
      const wnd = result.recommendation.window;
      const lines: string[] = [];
      lines.push(wnd ? fill(t, 'ai.ans.best.window', { window: wnd }) : t('ai.ans.best.nowindow'));
      lines.push(
        fill(t, 'ai.ans.best.metrics', {
          temp: evs(temp),
          rain: round(rainProb),
          wind: fmtWind(t, current),
          humidity: hum != null ? fill(t, 'ai.ans.best.humidity', { humidity: round(hum) }) : ''
        })
      );
      lines.push(t('ai.ans.best.uvNone'));
      lines.push(t('ai.ans.best.footer'));
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.requirements', 'ai.basis.forecast', 'ai.basis.current'] };
    }

    case 'rain_today': {
      const lines: string[] = [];
      if (rainProb > 50) {
        lines.push(fill(t, 'ai.ans.rain.likely', { prob: round(rainProb) }));
        lines.push(today?.rainfall != null ? fill(t, 'ai.ans.rain.rainfall', { rainfall: round(today.rainfall) }) : t('ai.ans.none').replace(/\.$/, ''));
        lines.push(t('ai.ans.rain.cover'));
      } else if (rainProb > 20) {
        lines.push(fill(t, 'ai.ans.rain.chance', { prob: round(rainProb) }));
      } else {
        lines.push(fill(t, 'ai.ans.rain.low', { prob: round(rainProb) }));
      }
      if (safetyActive && topWarning) lines.push(`⚠️ ${warningLine()}`);
      lines.push(t('ai.ans.rain.source'));
      return { intent, text: lines.join('\n'), basis: ['ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings'] };
    }

    case 'rain_tomorrow': {
      if (!tomorrow) {
        return { intent, text: t('ai.ans.rain.tomorrowNone'), basis: ['ai.basis.forecast'] };
      }
      const rp = num(tomorrow.rainProb) ?? 0;
      const lines = [
        fill(t, 'ai.ans.rain.tomorrowMain', { day: tomorrow.weekday, prob: round(rp) }),
        fill(t, 'ai.ans.rain.tomorrowTemp', { condition: tomorrow.condition || 'conditions', max: round(tomorrow.tMax), min: round(tomorrow.tMin) })
      ];
      if (rp > 50) lines.push(t('ai.ans.rain.tomorrowCover'));
      return { intent, text: lines.join('\n'), basis: ['ai.basis.forecast'] };
    }

    case 'forecast_today': {
      const lines: string[] = [];
      if (!today) {
        lines.push(t('ai.ans.none'));
        lines.push(t('ai.ans.forecast.todayNone'));
      } else {
        lines.push(fill(t, 'ai.ans.forecast.todayLine', { day: today.weekday, condition: today.condition || 'forecast available', max: round(tmax), min: round(tmin), rain: round(rainProb) }));
        if (hum != null) lines.push(fill(t, 'ai.ans.forecast.todayHumidity', { humidity: round(hum) }));
      }
      if (safetyActive && topWarning) lines.push(`⚠️ ${warningLine()}`);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings'] };
    }

    case 'forecast_week': {
      const lines: string[] = [];
      if (!ctx.forecast.length) {
        lines.push(t('ai.ans.none'));
        lines.push(t('ai.ans.forecast.weekNone'));
      } else {
        ctx.forecast.slice(0, 5).forEach((d) => {
          lines.push(fill(t, 'ai.ans.forecast.weekDay', { day: d.weekday, condition: d.condition || '--', max: round(d.tMax), min: round(d.tMin), rain: round(d.rainProb) }));
        });
        lines.push(t('ai.ans.forecast.weekNote'));
      }
      return { intent, text: lines.join('\n'), basis: ['ai.basis.forecast'] };
    }

    case 'current_conditions': {
      if (!current) {
        return { intent, text: t('ai.ans.none') + '\n' + t('ai.ans.current.none'), basis: ['ai.basis.current'] };
      }
      const lines = [
        fill(t, 'ai.ans.current.main', {
          location: ctx.locationLabel,
          condition: current.weatherCondition || 'conditions observed',
          temp: round(current.temperature),
          feels: feels != null ? fill(t, 'ai.ans.current.feels', { feels: round(feels) }) : ''
        }),
        fmtWind(t, current),
        fill(t, 'ai.ans.current.humvis', { humidity: hum != null ? round(hum) : t('ai.ans.na'), visibility: vis != null ? vis.toFixed(1) : t('ai.ans.na') }),
        fill(t, 'ai.ans.current.rainProb', { rain: round(rainProb) })
      ];
      if (safetyActive && topWarning) lines.push(`⚠️ ${warningLine()}`);
      lines.push(fill(t, 'ai.ans.sourceLabel', { source: isFallbackMode(ctx.dataMode) ? t('ai.ans.current.sourceSim') : t('ai.ans.demoSource') }));
      return { intent, text: lines.join('\n'), basis: ['ai.basis.current', 'ai.basis.location'] };
    }

    case 'uv':
      return { intent, text: t('ai.ans.uv'), basis: ['ai.basis.current'] };

    case 'wind': {
      const ws = num(current?.windSpeed);
      return {
        intent,
        text: `${fmtWind(t, current)}${ws == null ? '\n' + t('ai.ans.none') : ' · ' + t('ai.ans.wind.extra')}`,
        basis: ['ai.basis.current']
      };
    }

    case 'visibility': {
      const vs = num(current?.visibility);
      return {
        intent,
        text: `Visibility ${vs != null ? vs.toFixed(1) + ' km' : t('ai.ans.vis.notAvailable')}${vs != null && vs < 2 ? ' - ' + t('ai.ans.vis.low') : vs != null ? ' - ' + t('ai.ans.vis.ok') : ''}`,
        basis: ['ai.basis.current']
      };
    }

    case 'air_quality':
      return {
        intent,
        text: `${t('ai.ans.air.main')}\n${t('ai.ans.air.note')}`,
        basis: ['ai.basis.current']
      };

    case 'commute': {
      const lines: string[] = [];
      lines.push(fill(t, 'ai.ans.commute.main', { condition: current?.weatherCondition || t('ai.ans.na'), temp: evs(temp) }));
      lines.push(fill(t, 'ai.ans.commute.rainVis', { rain: round(rainProb), vis: vis != null ? fill(t, 'ai.ans.commute.vis', { visibility: vis.toFixed(1) }) : '' }));
      if (rainProb > 40) lines.push(t('ai.ans.commute.rainRisk'));
      if (ctx.nowcount > 0) lines.push(fill(t, 'ai.ans.commute.nowcast', { count: String(ctx.nowcount) }));
      lines.push(fill(t, 'ai.ans.commute.warnings', { warning: warningLine() }));
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings'] };
    }

    case 'field_work': {
      const lines: string[] = [];
      if (rainProb > 45) {
        lines.push(fill(t, 'ai.ans.field.rain', { prob: round(rainProb) }));
        lines.push(t('ai.ans.field.review'));
      } else if ((temp ?? 99) > 40) {
        lines.push(fill(t, 'ai.ans.field.heat', { temp: evs(temp) }));
      } else {
        lines.push(fill(t, 'ai.ans.field.moderate', { temp: evs(temp), rain: round(rainProb) }));
      }
      lines.push(t('ai.ans.field.note'));
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.requirements', 'ai.basis.current', 'ai.basis.forecast'] };
    }

    case 'aviation': {
      const windSpd = num(current?.windSpeed);
      const lines: string[] = [
        t('ai.ans.aviation.head'),
        fill(t, 'ai.ans.aviation.wind', {
          wind: windSpd == null ? t('ai.ans.na') : round(windSpd),
          direction: current?.windDirection ? fill(t, 'ai.ans.aviation.dir', { direction: current.windDirection }) : ''
        }),
        fill(t, 'ai.ans.aviation.visibility', { visibility: vis != null ? vis.toFixed(1) : t('ai.ans.na') }),
        `\u2022 ${warningLine()}`
      ];
      lines.push(t('ai.ans.aviation.note'));
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.current', 'ai.basis.warnings'] };
    }

    case 'beach': {
      const windSpd = num(current?.windSpeed);
      const lines: string[] = [
        fill(t, 'ai.ans.beach.main', { wind: windSpd == null ? t('ai.ans.na') : round(windSpd), temp: evs(temp) })
      ];
      lines.push(t('ai.ans.beach.note'));
      if (safetyActive && topWarning) lines.push(`⚠️ ${warningLine()}`);
      return { intent, text: lines.join('\n'), basis: ['ai.basis.profile', 'ai.basis.current', 'ai.basis.warnings'] };
    }

    case 'warnings_any': {
      const lines: string[] = [];
      if (safetyActive && topWarning) {
        lines.push(warningLine());
        lines.push(t('ai.ans.warnings.safetyBelow'));
      } else {
        lines.push(fill(t, 'ai.ans.warnings.none', { location: ctx.locationLabel }));
        if (ctx.nowcount > 0) lines.push(fill(t, 'ai.ans.warnings.nowcast', { count: String(ctx.nowcount) }));
        else lines.push(t('ai.ans.warnings.noNowcast'));
      }
      return { intent, text: lines.join('\n'), basis: ['ai.basis.warnings'] };
    }

    case 'explain_warning': {
      if (!topWarning) {
        return thisIntent('warnings_any', ctx, t);
      }
      const lines: string[] = [
        fill(t, 'ai.ans.explain.event', { event: topWarning.event }),
        fill(t, 'ai.ans.explain.sev', { severity: topWarning.severity.toUpperCase(), area: topWarning.area || ctx.locationLabel }),
        fill(t, 'ai.ans.explain.valid', { from: fmtWhen(ctx, topWarning.validFrom), until: fmtWhen(ctx, topWarning.validUntil) })
      ];
      if (topWarning.detail) lines.push(topWarning.detail);
      lines.push(warningNote(t, topWarning));
      lines.push(t('ai.ans.explain.priority'));
      return { intent, text: lines.join('\n'), basis: ['ai.basis.warnings'] };
    }

    case 'why': {
      const why = result.recommendation.why.slice(0, 4);
      const lines: string[] = [
        t('ai.ans.why.head'),
        ...why.map((r) => `${r.ok ? '✓' : '·'} ${r.text}`),
        t('ai.ans.why.footer')
      ];
      return {
        intent,
        text: lines.join('\n'),
        basis: ['ai.basis.profile', 'ai.basis.requirements', 'ai.basis.location', 'ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings', 'ai.basis.engine']
      };
    }

    case 'help':
    default: {
      const lines: string[] = [t('ai.ans.help.one'), t('ai.ans.help.two'), t('ai.ans.help.three')];
      return { intent: 'help', text: lines.join('\n'), basis: ['ai.basis.current', 'ai.basis.forecast', 'ai.basis.warnings'] };
    }
  }
}

function thisIntent(i: AiIntent, ctx: MausamAiContext, t: TDict): AiAnswer {
  return answerIntent(i, ctx, t);
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

/** Keyword intent matching (English + Hindi + Punjabi). */
export function intentFromText(raw: string): AiIntent {
  const s = raw.toLowerCase();
  const has = (...words: string[]) => words.some((w) => s.includes(w));
  if (has('warn', 'alert', 'warning', 'चेतावनी', 'अलर्ट', 'ਚੇਤਾਵਨੀ', 'ਅਲਰਟ')) return 'warnings_any';
  if (has('why', 'क्यों', 'क्यूं', 'क्यो', 'ਕਿਉਂ')) return 'why';
  if (has('tomorrow', 'कल', 'ਕੱਲ੍ਹ') && has('rain', 'wet', 'shower', 'बारिश', 'बरसात', 'मीਂਹ', 'ਬਾਰਿਸ਼', 'ਮੀਂਹ')) return 'rain_tomorrow';
  if (has('5-day', '5 day', 'week', 'next days', '7-day', '7 day', 'outlook', 'हफ्ता', 'ਹਫਤਾ', 'ਸਪਤਾਹ') && has('forecast', 'weather', 'rain', 'पूर्वानुमान', 'ਮੌਸਮ', 'ਪੂਰਵ ਅਨੁਮਾਨ')) return 'forecast_week';
  if (has('forecast', 'predict', 'पूर्वानुमान', 'ਪੂਰਵ ਅਨੁਮਾਨ') || (has('today', 'आज', 'ਅੱਜ') && has('weather', 'मौसम', 'ਮੌਸਮ'))) return 'forecast_today';
  if (has('best', 'window', 'run', 'outdoor', 'time to', 'सबसे अच्छा', 'ਵਧੀਆ')) return 'best_time';
  if (has('uv', 'sunburn')) return 'uv';
  if (has('wind', 'windy', 'gust', 'हवा', 'ਹਵਾ', 'ਤੇਜ਼ ਹਵਾ')) return 'wind';
  if (has('visibility', 'fog', 'दृश्यता', 'कोहरा', 'ਦਿੱਖ', 'ਧੁੰਦ')) return 'visibility';
  if (has('air', 'aqi', 'pollution', 'quality', 'वायु')) return 'air_quality';
  if (has('commute', 'traffic', 'drive', 'route', 'road', 'आवागमन', 'रास्ता', 'ਆਵਾਜਾਈ', 'ਰਸਤਾ')) return 'commute';
  if (has('field', 'farm', 'plant', 'water', 'crop', 'खेत', 'ਖੇਤ')) return 'field_work';
  if (has('flight', 'airport', 'aviation', 'pilot', 'metar', 'विमानन', 'ਏਵੀਏਸ਼ਨ')) return 'aviation';
  if (has('beach', 'sea', 'wave', 'coast', 'tide', 'समुद्र', 'ਬੀਚ')) return 'beach';
  if (has('current', 'now', 'conditions', 'अभी', 'ਹੁਣ')) return 'current_conditions';
  if (/^(hi|hello|hey|namaste|good|नमस्ते|हैलो|ਸਤ|ਸਤਸ੍ਰੀ)/.test(s)) return 'greeting';
  return 'help';
}
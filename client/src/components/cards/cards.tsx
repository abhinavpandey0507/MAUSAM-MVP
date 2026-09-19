import type { ComponentType } from 'react';
import {
  AlertTriangle,
  Clock,
  Thermometer,
  Sun,
  Wind,
  Droplets,
  CloudRain,
  Eye,
  Factory,
  CalendarRange,
  Sprout,
  Umbrella,
  Waves,
  CloudFog,
  Zap,
  BarChart3,
  Plane,
  MapPin,
  ArrowRight,
  SunMedium,
  Info,
  Cloud,
  Map,
  PlayCircle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import type { WeatherEnvelope, PersonaId, PersonalizationResult, Warning } from '../../types';

export interface CardContext {
  weather: WeatherEnvelope | null;
  persona: PersonaId;
  demo: boolean;
  t: (k: string) => string;
}

/* ------------------------- small presenters ------------------------- */
function Sub({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400">{children}</p>;
}

function NotAvailable({ t }: { t: (k: string) => string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500 ring-1 ring-slate-200/70">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      {t('data.notAvailable')}
    </div>
  );
}

function scoreBadge(score: number) {
  const tone = score >= 66 ? 'emerald' : score >= 40 ? 'amber' : 'red';
  const map = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200'
  } as const;
  return map[tone];
}

function Bar({ value, tone }: { value: number; tone: 'blue' | 'emerald' | 'amber' | 'red' }) {
  const colors = { blue: 'bg-brand-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' } as const;
  return (
    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${colors[tone]} transition-all`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

function MiniFcStrip({ weather }: { weather: WeatherEnvelope }) {
  const days = weather.forecast.slice(0, 5);
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {days.map((d) => (
        <div key={d.date} className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 py-2.5 ring-1 ring-slate-100">
          <span className="text-[10px] font-bold uppercase text-slate-400">{d.weekday}</span>
          <span className="text-[10px]">{d.condition.split(' ')[0]}</span>
          <span className="text-sm font-bold text-slate-900">{Math.round(d.tMax)}°</span>
          <span className="text-xs text-slate-400">{Math.round(d.tMin)}°</span>
          {d.rainProb > 30 && <span className="text-[10px] font-semibold text-brand-600">☔ {d.rainProb}%</span>}
        </div>
      ))}
    </div>
  );
}

function InsightBlock({ headline, text }: { headline: string; text: string }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-brand-50 to-sky-50 px-3.5 py-3 ring-1 ring-brand-100">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-600">MAUSAM Insight</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{headline}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{text}</p>
      <p className="mt-1.5 text-[10px] italic text-slate-400">Based on current forecast conditions.</p>
    </div>
  );
}

/* --------------------------- renderers --------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Renderer = (ctx: CardContext, result: PersonalizationResult) => React.ReactNode;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const CARD_RENDERERS: Record<string, Renderer> = {
  severe_alert: ({ weather, t }, result) => {
    const w = result.topWarning;
    if (!w) return null;
    return <SevereBanner weather={weather} t={t} w={w} />;
  },
  outdoor_window: ({ weather, t }) => {
    const today = weather?.forecast?.[0];
    const cur = weather?.current;
    const tmax = today?.tMax ?? cur?.temperature ?? 30;
    const rain = today?.rainProb ?? 0;
    let window = '5:30 AM – 7:30 AM';
    let advice = 'Cooler morning, lower UV and low rain probability.';
    let tone: 'emerald' | 'amber' | 'red' = 'emerald';
    let score = 85;
    if (rain > 55) {
      window = 'Flexible / avoid heavy rain';
      advice = 'High rain probability — prefer an indoor or flexible window.';
      tone = 'red';
      score = 30;
    } else if (rain > 35) {
      window = 'Morning (early) preferred';
      advice = 'Moderate rain chance — start early to reduce exposure.';
      tone = 'amber';
      score = 55;
    } else if (tmax > 37) {
      window = '5:00 AM – 7:00 AM or evening 6:00 PM+';
      advice = 'High heat — schedule around the coolest hours.';
      tone = 'amber';
      score = 60;
    } else {
      window = cur && isNum(cur.temperature) && cur.temperature > 34 ? '6:00 PM – 8:00 PM' : '5:30 AM – 7:30 AM';
    }
    return (
      <div>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xl font-extrabold text-slate-900">{window}</p>
            <Sub>{advice}</Sub>
          </div>
          <span className={`rounded-xl px-2.5 py-1 text-xs font-bold ring-1 ${scoreBadge(score)}`}>{score > 66 ? 'Suitable' : score > 40 ? 'Moderate' : 'Limited'}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-slate-400">Rain</p>
            <p className="font-bold text-slate-800">{rain}%</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-slate-400">High temp</p>
            <p className="font-bold text-slate-800">{Math.round(tmax as number)}°C</p>
          </div>
        </div>
        <Bar value={score} tone={tone} />
      </div>
    );
  },
  temperature: ({ weather }) => {
    const w = weather?.current;
    if (!w) return null;
    return (
      <div className="flex items-center gap-4">
        <span className="text-5xl font-extrabold tracking-tight text-slate-900">{Math.round(w.temperature)}°</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-700">{w.weatherCondition}</p>
          <p className="text-xs text-slate-400">Feels like {Math.round(w.feelsLike)}°</p>
          {w.stationName && <p className="mt-0.5 text-[10px] text-slate-400">Observed at {w.stationName}</p>}
        </div>
        <Thermometer className="h-9 w-9 text-brand-500" />
      </div>
    );
  },
  uv: ({ t }) => (
    <div>
      <p className="text-sm font-semibold text-slate-700">UV index</p>
      <NotAvailable t={t} />
      <Sub>Shown because UV exposure matters for outdoor runners.</Sub>
    </div>
  ),
  wind: ({ weather }) => {
    const w = weather?.current;
    if (!isNum(w?.windSpeed)) return null;
    const calm = w?.windSpeed < 15;
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold text-slate-900">{w?.windSpeed?.toFixed(1)} km/h</span>
          <Wind className="h-7 w-7 text-sky-500" />
        </div>
        <p className="text-xs text-slate-500">
          {w?.windDirection || '--'} · {calm ? 'Light winds' : 'Moderate winds'}
        </p>
        <Bar value={Math.min(100, ((w?.windSpeed ?? 0) / 40) * 100)} tone={calm ? 'emerald' : 'amber'} />
      </div>
    );
  },
  humidity: ({ weather }) => {
    const h = weather?.current?.humidity;
    if (!isNum(h)) return null;
    const hi = h > 70;
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold text-slate-900">{Math.round(h)}%</span>
          <Droplets className="h-7 w-7 text-sky-500" />
        </div>
        <p className="text-xs text-slate-500">{hi ? 'Humid — feels warmer' : 'Comfortable humidity'}</p>
        <Bar value={h} tone={hi ? 'amber' : 'emerald'} />
      </div>
    );
  },
  air_quality: ({ t }) => (
    <div>
      <p className="text-sm font-semibold text-slate-700">AQI</p>
      <NotAvailable t={t} />
      <Sub>Provided by CPCB sources, not by the IMD weather API.</Sub>
    </div>
  ),
  rain: ({ weather }) => {
    const today = weather?.forecast?.[0];
    const rain = today?.rainProb ?? 0;
    const tone = rain <= 30 ? 'emerald' : rain <= 60 ? 'amber' : 'red';
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold text-slate-900">{Math.round(rain)}%</span>
          <CloudRain className="h-7 w-7 text-sky-500" />
        </div>
        <p className="text-xs text-slate-500">
          {today?.condition} · {(today?.rainfall ?? 0).toFixed(1)} mm expected today
        </p>
        <Bar value={rain} tone={tone} />
      </div>
    );
  },
  rainfall: ({ weather }) => {
    const today = weather?.forecast?.[0];
    const week = weather?.forecast?.slice(0, 5) ?? [];
    const wetDays = week.filter((d) => (d.rainProb ?? 0) > 40).length;
    const rain = today?.rainfall ?? 0;
    const monsoonal = (today?.rainProb ?? 0) > 60;
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{rain.toFixed(1)} mm</p>
            <Sub>Expected today · {wetDays} wet days in next 5</Sub>
          </div>
          <Umbrella className="h-8 w-8 text-brand-500" />
        </div>
        <MiniFcStrip weather={weather as WeatherEnvelope} />
        <p className="mt-2 text-xs text-slate-500">
          {monsoonal ? 'Active wet spell — plan irrigation & field work around rain windows.' : 'Generally dry — stable for most field activities.'}
        </p>
      </div>
    );
  },
  field_work: ({ weather, t }) => {
    const today = weather?.forecast?.[0];
    const cur = weather?.current;
    const rain = today?.rainProb ?? 0;
    const tmax = today?.tMax ?? cur?.temperature ?? 30;
    let score = 70;
    if (rain > 55) score -= 40;
    else if (rain > 35) score -= 20;
    if (tmax > 40) score -= 25;
    else if (tmax > 36) score -= 10;
    if (isNum(cur?.humidity) && (cur?.humidity as number) > 88) score -= 10;
    score = Math.max(5, Math.min(98, score));
    const label = score >= 66 ? 'Suitable' : score >= 40 ? 'Moderate' : 'Limited';
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className={`rounded-xl px-2.5 py-1 text-sm font-extrabold ring-1 ${scoreBadge(score)}`}>{label}</p>
            <Sub>
              {rain > 55 ? 'Rain — postpone outdoor operations' : tmax > 40 ? 'Heat stress' : 'Dry window available'}
            </Sub>
          </div>
          <Sprout className="h-8 w-8 text-emerald-500" />
        </div>
        <Bar value={score} tone={score >= 66 ? 'emerald' : score >= 40 ? 'amber' : 'red'} />
        <p className="mt-2 text-[10px] italic text-slate-400">{t('common.insight')} — general weather guidance, not a crop prescription.</p>
      </div>
    );
  },
  severe_weather: ({ weather, t }) => {
    const warnings = weather?.warnings ?? [];
    if (!warnings.length) {
      return (
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          <div>
            <p className="text-sm font-bold text-emerald-700">No active official severe-weather warning</p>
            <Sub>{t('alerts.source')}</Sub>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {warnings.map((w, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-200">
            <div>
              <p className="text-sm font-bold text-amber-800">{w.event}</p>
              <p className="text-[10px] text-amber-700">{w.area} · IMD</p>
            </div>
            <span className="chip bg-amber-100 text-amber-800 ring-amber-300">{w.severity.toUpperCase()}</span>
          </div>
        ))}
      </div>
    );
  },
  forecast_5: ({ weather }) => (weather ? <MiniFcStrip weather={weather} /> : null),
  farm_insight: ({ weather }) => {
    const today = weather?.forecast?.[0];
    const rain = today?.rainProb ?? 0;
    const tmax = today?.tMax ?? 30;
    const text =
      rain > 55
        ? 'Rain expected — review outdoor field work and irrigation schedules.'
        : tmax > 40
          ? 'High temperature stress expected — schedule labour and irrigation for cooler hours.'
          : 'Dry moderate conditions favour field work today.';
    return (
      <InsightBlock
        headline={rain > 55 ? 'Rain expected — review field work' : tmax > 40 ? 'High heat stress expected' : 'Suitable conditions for field work'}
        text={text}
      />
    );
  },
  rain_risk: ({ weather }) => {
    const today = weather?.forecast?.[0];
    const cur = weather?.current;
    const rain = today?.rainProb ?? 0;
    const wet = (cur?.rainfall ?? 0) > 0;
    const level = rain >= 60 ? 'High' : rain >= 35 ? 'Moderate' : 'Low';
    const tone = rain >= 60 ? 'red' : rain >= 35 ? 'amber' : 'emerald';
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className={`rounded-xl px-3 py-1.5 text-sm font-extrabold ring-1 ${scoreBadge(rain >= 60 ? 20 : rain >= 35 ? 50 : 85)}`}>{level}</span>
          <Umbrella className="h-7 w-7 text-sky-500" />
        </div>
        <p className="mt-1.5 text-xs text-slate-500">
          {wet ? 'Light rain observed now.' : `Rain chance most likely ${rainingLikelyHour(weather)}.`} Carry protection if level is not Low.
        </p>
        <Bar value={rain} tone={tone} />
      </div>
    );
  },
  visibility: ({ weather, t }) => {
    const v = weather?.current?.visibility;
    if (!isNum(v)) {
      return (
        <div>
          <p className="text-sm font-semibold text-slate-700">Visibility</p>
          <NotAvailable t={t} />
        </div>
      );
    }
    const low = v < 2;
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold text-slate-900">{v.toFixed(1)} km</span>
          <Eye className="h-7 w-7 text-sky-500" />
        </div>
        <p className="text-xs text-slate-500">{low ? 'Reduced visibility — drive with care' : 'Good visibility'}</p>
        <Bar value={Math.min(100, (v / 10) * 100)} tone={low ? 'red' : 'emerald'} />
      </div>
    );
  },
  fog: ({ weather, t }) => {
    const hum = weather?.current?.humidity;
    const wind = weather?.current?.windSpeed;
    if (!isNum(hum) || !isNum(wind)) {
      return (
        <div>
          <p className="text-sm font-semibold text-slate-700">Fog risk</p>
          <NotAvailable t={t} />
        </div>
      );
    }
    const score = hum > 88 && wind < 8 ? 78 : hum > 80 ? 40 : 12;
    const tone = score >= 60 ? 'amber' : score >= 30 ? 'amber' : 'emerald';
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xl font-extrabold text-slate-900">{score >= 60 ? 'Elevated' : 'Low'}</span>
          <CloudFog className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-xs text-slate-500">Estimate from humidity ({Math.round(hum)}%) & winds ({wind.toFixed(0)} km/h)</p>
        <Bar value={score} tone={tone} />
      </div>
    );
  },
  storm: ({ weather }) => {
    const warnings = weather?.warnings ?? [];
    if (!warnings.length)
      return (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Zap className="h-5 w-5 text-amber-500" /> No storm / lightning warnings issued.
        </div>
      );
    return (
      <div>
        {warnings.map((w, i) => (
          <p key={i} className="text-sm text-amber-700">
            ⚠ {w.event} ({w.area})
          </p>
        ))}
      </div>
    );
  },
  hourly: ({ weather }) => {
    const points = weather?.hourly ?? [];
    if (!points.length) return null;
    const first = points[0];
    const last = points[points.length - 1];
    return (
      <div>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {first.label} → {last.label}
          </span>
          <span className="font-bold text-slate-700">next 24h</span>
        </div>
        <HourlyChart points={points} />
      </div>
    );
  },
  destination: ({ weather }) => {
    const w = weather?.current;
    if (!w) return null;
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-extrabold text-slate-900">{Math.round(w.temperature)}°</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">{w.weatherCondition}</p>
            <p className="text-xs text-slate-400">Destination: {weather?.location} · humidity {Math.round(w.humidity)}%</p>
          </div>
          <Plane className="h-7 w-7 text-violet-500" />
        </div>
        <MiniFcStrip weather={weather as WeatherEnvelope} />
      </div>
    );
  },
  forecast_7: ({ weather }) => {
    if (!weather) return null;
    return <ForecastTable weather={weather} />;
  },
  travel_insight: ({ weather }) => {
    const today = weather?.forecast?.[0];
    const warnings = weather?.warnings ?? [];
    const rain = today?.rainProb ?? 0;
    return (
      <InsightBlock
        headline={warnings.length ? 'Check active warnings before travel' : rain > 45 ? 'Carry rain protection for travel' : 'Travel outlook is stable'}
        text={
          warnings.length
            ? 'A weather warning is in effect for the area. Verify destination conditions and travel advisories before departure.'
            : rain > 45
              ? 'Moderate-to-high rain probability — plan travel during dry windows and carry protection.'
              : 'No active warnings. Review the 7-day forecast for destination-specific details.'
        }
      />
    );
  },
  commute: ({ weather }) => {
    const w = weather?.current;
    const today = weather?.forecast?.[0];
    const rain = today?.rainProb ?? 0;
    if (!w) return null;
    const advise =
      rain > 55
        ? 'Heavy rain chance — allow extra time and check IMD alerts.'
        : w.windSpeed > 25
          ? 'Strong winds — two-wheelers take care.'
          : 'Normal commute conditions expected.';
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{Math.round(w.temperature)}°C</p>
            <p className="text-xs text-slate-500">{w.weatherCondition} · {Math.round(w.humidity)}% humidity</p>
          </div>
          <Map className="h-7 w-7 text-brand-500" />
        </div>
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">{advise}</p>
        <Bar value={rain} tone={rain > 55 ? 'red' : rain > 35 ? 'amber' : 'emerald'} />
      </div>
    );
  },
  sea_conditions: ({ weather, t }) => {
    const w = weather?.current;
    const today = weather?.forecast?.[0];
    const wind = isNum(w?.windSpeed) ? (w?.windSpeed as number) : null;
    const rain = today?.rainProb ?? 0;
    return (
      <div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{wind != null ? wind.toFixed(0) + ' km/h' : '--'}</p>
            <p className="text-xs text-slate-500">Coastal wind · {w?.windDirection || '--'}</p>
          </div>
          <Waves className="h-7 w-7 text-cyan-500" />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-slate-400">Waves / swell</p>
            <p className="font-bold text-slate-700">Needs IMD marine API</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-slate-400">Tide data</p>
            <p className="font-bold text-slate-700">Needs IMD marine API</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
          <Zap className={rain > 45 ? 'h-4 w-4 text-amber-500' : 'h-4 w-4 text-slate-400'} />
          <span className="text-slate-600">{rain > 45 ? 'Elevated storm / wave risk — stay cautious near shore.' : 'No elevated storm signals today.'}</span>
        </div>
        <NotAvailable t={t} />
      </div>
    );
  },
  aviation: ({ weather }) => {
    const w = weather?.current;
    const today = weather?.forecast?.[0];
    const wind = isNum(w?.windSpeed) ? (w?.windSpeed as number) : null;
    const vis = isNum(w?.visibility) ? (w?.visibility as number) : null;
    const rain = today?.rainProb ?? 0;
    return (
      <div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold text-slate-900">Wind {wind != null ? wind.toFixed(0) : '--'} km/h</span>
          <Plane className="h-7 w-7 text-sky-500" />
        </div>
        <p className="text-xs text-slate-500">
          Visibility {vis != null ? vis.toFixed(1) + ' km' : 'n/a'} · {w?.windDirection || '--'} · Rain {Math.round(rain)}%
        </p>
        <Bar value={Math.min(100, ((wind ?? 0) / 40) * 100)} tone={vis != null && vis < 2 ? 'red' : wind != null && wind > 25 ? 'amber' : 'emerald'} />
        <p className="mt-2 text-[10px] italic text-slate-400">
          METAR/TAF & cloud-ceiling feeds require the IMD thematic API key (not available from the current source).
        </p>
      </div>
    );
  },
  generic: ({ weather }) => {
    const w = weather?.current;
    if (!w) return null;
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-extrabold text-slate-900">{Math.round(w.temperature)}°</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">{w.weatherCondition}</p>
            <p className="text-xs text-slate-400">Feels like {Math.round(w.feelsLike)}° · {Math.round(w.humidity)}% RH</p>
          </div>
        </div>
        <MiniFcStrip weather={weather as WeatherEnvelope} />
      </div>
    );
  },
  current: ({ weather }) => {
    const w = weather?.current;
    if (!w) return null;
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="text-4xl font-extrabold text-slate-900">{Math.round(w.temperature)}°</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-700">{w.weatherCondition}</p>
            <p className="text-xs text-slate-400">Wind {w.windDirection || '--'} {w.windSpeed?.toFixed(0)} km/h</p>
          </div>
          <Sun className="h-7 w-7 text-amber-400" />
        </div>
      </div>
    );
  }
};

function rainingLikelyHour(weather: WeatherEnvelope | null): string {
  const today = weather?.forecast?.[0];
  const rain = today?.rainProb ?? 0;
  if (rain >= 60) return 'afternoon showers';
  if (rain >= 40) return 'late afternoon';
  return 'low probability';
}

function HourlyChart({ points }: { points: WeatherEnvelope['hourly'] }) {
  const max = Math.max(...points.map((p) => p.temperature), 1);
  const min = Math.min(...points.map((p) => p.temperature), 0);
  const range = Math.max(1, max - min);
  return (
    <div className="flex items-end justify-between gap-1 rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100">
      {points.map((p, i) => {
        const h = 20 + ((p.temperature - min) / range) * 60;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-slate-500">{Math.round(p.temperature)}°</span>
            <div className="flex w-full items-end justify-center" style={{ height: 46 }}>
              <div className="w-full rounded-t bg-gradient-to-t from-brand-500 to-brand-300" style={{ height: `${h}%`, opacity: 0.55 + (p.rainProb / 100) * 0.45 }} />
            </div>
            <span className="text-[9px] text-slate-400">{p.label.slice(0, 2)}h</span>
          </div>
        );
      })}
    </div>
  );
}

function SevereBanner({ weather, t, w }: { weather: WeatherEnvelope | null; t: (k: string) => string; w: Warning }) {
  void weather;
  const manual = w.source === 'demo-simulation';
  const sev = w.severity.toUpperCase();
  return (
    <div className={`rounded-2xl p-4 ring-2 ${manual ? 'bg-amber-50 ring-amber-300' : 'bg-red-50 ring-red-300'}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className={`h-6 w-6 ${manual ? 'text-amber-600' : 'text-red-600'}`} />
        <p className={`text-sm font-extrabold uppercase tracking-wide ${manual ? 'text-amber-700' : 'text-red-700'}`}>
          {t('card.severe_alert')} · {sev}
        </p>
      </div>
      <p className="mt-2 text-lg font-extrabold text-slate-900">{w.event}</p>
      <p className="text-xs text-slate-600">{w.area} · India Meteorological Department</p>
      {manual && (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
          Demo scenario — not an official IMD warning
        </p>
      )}
      {w.detail && <p className="mt-2 text-xs text-slate-600">{w.detail}</p>}
      <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-700">
        Personalization temporarily moves below this safety information (priority-0 override rule).
      </p>
    </div>
  );
}

function ForecastTable({ weather }: { weather: WeatherEnvelope }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
            <th className="pb-2">Day</th>
            <th className="pb-2">Condition</th>
            <th className="pb-2 text-right">Max / Min</th>
            <th className="pb-2 text-right">Rain</th>
            <th className="pb-2 text-right">Hum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {weather.forecast.map((d) => (
            <tr key={d.date}>
              <td className="py-2 text-xs font-bold text-slate-700">{d.date.slice(5)} · {d.weekday}</td>
              <td className="py-2 text-xs text-slate-600">{d.condition}</td>
              <td className="py-2 text-right font-semibold text-slate-900">
                {Math.round(d.tMax)}° / {Math.round(d.tMin)}°
              </td>
              <td className="py-2 text-right text-xs text-brand-600">{d.rainProb}%</td>
              <td className="py-2 text-right text-xs text-slate-500">{Math.round(d.humidity)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------- card shell --------------------------- */
export const CARD_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  severe_alert: AlertTriangle,
  outdoor_window: Clock,
  temperature: Thermometer,
  uv: Sun,
  wind: Wind,
  humidity: Droplets,
  air_quality: Factory,
  rain: CloudRain,
  rainfall: Umbrella,
  field_work: Sprout,
  severe_weather: Zap,
  forecast_5: CalendarRange,
  farm_insight: Sprout,
  rain_risk: Umbrella,
  visibility: Eye,
  fog: CloudFog,
  storm: Zap,
  hourly: BarChart3,
  destination: Plane,
  forecast_7: CalendarRange,
  travel_insight: Plane,
  commute: MapPin,
  generic: SunMedium,
  sea_conditions: Waves,
  aviation: Plane,
  current: MapPin
};
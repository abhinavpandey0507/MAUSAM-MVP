import { useState } from 'react';
import { CalendarRange, Clock3, CloudRain } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { PageShell } from '../components/PageShell';
import { DataBadge } from '../components/DataBadge';
import { fmtTemp } from '../utils/format';
import type { WeatherEnvelope } from '../types';

export function Forecast() {
  const { location, language, demoMode } = useApp();
  const t = makeT(language);
  const [view, setView] = useState<'daily' | 'hourly'>('daily');

  const { data: weather, loading, updating, error, refetch } = useAsyncData<WeatherEnvelope>(
    () => api.weather(location, demoMode),
    [location, demoMode]
  );

  const tempPoints = (weather?.forecast ?? []).map((d) => ({
    day: d.weekday,
    max: Math.round(d.tMax),
    min: Math.round(d.tMin),
    rain: d.rainProb
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{t('nav.forecast')}</h1>
          <p className="text-sm text-slate-500">{weather?.location ?? ''} · 7-day outlook</p>
        </div>
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          <button
            onClick={() => setView('daily')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              view === 'daily' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            <CalendarRange className="h-4 w-4" /> {t('btn.daily')}
          </button>
          <button
            onClick={() => setView('hourly')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
              view === 'hourly' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            <Clock3 className="h-4 w-4" /> {t('btn.hourly')}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <DataBadge meta={weather?.meta ?? null} />
      </div>

      <PageShell loading={loading} updating={updating} error={error} onRetry={refetch}>
        {view === 'daily' ? (
          <>
            <section className="card fade-up mt-4 p-4 md:p-5">
              <TempTrend points={tempPoints} />
            </section>

            <section className="card fade-up mt-4 overflow-hidden">
              <div className="border-b border-slate-100 px-5 py-3.5">
                <h2 className="text-sm font-bold text-slate-900">{t('card.forecast_7')}</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {(weather?.forecast ?? []).map((d) => (
                  <div key={d.date} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-16 text-sm font-bold text-slate-700">{d.weekday}</span>
                    <span className="w-24 truncate text-xs text-slate-500">{d.condition}</span>
                    <span className="flex-1 text-right text-sm text-slate-500">
                      <span className="font-bold text-slate-900">{Math.round(d.tMax)}°</span> / {Math.round(d.tMin)}°
                    </span>
                    <span className="hidden w-24 items-center justify-end gap-1 text-xs text-brand-600 sm:flex">
                      <CloudRain className="h-3.5 w-3.5" /> {d.rainProb}%
                    </span>
                    <span className="hidden w-20 text-right text-xs text-slate-400 sm:block">
                      RH {Math.round(d.humidity)}%
                    </span>
                    <span className="hidden w-16 text-right text-xs text-slate-400 lg:block">
                      {d.windSpeed} km/h
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="card fade-up mt-4 p-4 md:p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-900">{t('card.hourly')}</h2>
            <HourlyChartLarge points={weather?.hourly ?? []} />
            <p className="mt-3 text-[11px] italic text-slate-400">Derived hourly profile · not a live hourly observation source.</p>
          </section>
        )}
      </PageShell>
    </div>
  );
}

function TempTrend({ points }: { points: { day: string; max: number; min: number; rain: number }[] }) {
  if (!points.length) return null;
  const width = 640;
  const height = 180;
  const all = points.flatMap((p) => [p.max, p.min]);
  const min = Math.min(...all) - 3;
  const max = Math.max(...all) + 3;
  const span = max - min || 1;
  const x = (i: number) => 20 + (i * (width - 40)) / (points.length - 1 || 1);
  const y = (v: number) => height - 24 - ((v - min) / span) * (height - 48);

  const maxLine = points.map((p, i) => `${x(i)},${y(p.max)}`).join(' ');
  const minLine = points.map((p, i) => `${x(i)},${y(p.min)}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[540px]">
        <svg viewBox={`0 0 ${width} ${height + 8}`} className="w-full">
          <line x1="20" y1={height - 24} x2={width - 20} y2={height - 24} stroke="#e2e8f0" strokeWidth="1" />
          {[0, 1, 2, 3].map((i) => {
            const yy = 24 + (i * (height - 52)) / 3;
            return <line key={i} x1="20" y1={yy} x2={width - 20} y2={yy} stroke="#f1f5f9" strokeWidth="1" />;
          })}
          <polyline points={minLine} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
          <polyline points={maxLine} fill="none" stroke="#1d6af5" strokeWidth="3" strokeLinecap="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={x(i)} cy={y(p.max)} r="4" fill="#1d6af5" />
              <circle cx={x(i)} cy={y(p.min)} r="3.5" fill="#94a3b8" />
              <text x={x(i)} y={height} textAnchor="middle" fontSize="11" fill="#64748b" fontWeight="600">
                {p.day}
              </text>
              <text x={x(i)} y={y(p.max) - 9} textAnchor="middle" fontSize="10" fill="#1d6af5" fontWeight="700">
                {p.max}°
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>— Max temp (°C)</span>
          <span className="ml-auto">┅ Min temp (°C)</span>
        </div>
      </div>
    </div>
  );
}

function HourlyChartLarge({ points }: { points: WeatherEnvelope['hourly'] }) {
  if (!points.length) return null;
  const max = Math.max(...points.map((p) => p.temperature), 1);
  const min = Math.min(...points.map((p) => p.temperature), 0);
  const span = Math.max(1, max - min);
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-[540px] items-end justify-between gap-2">
        {points.map((p, i) => {
          const h = 28 + ((p.temperature - min) / span) * 90;
          const hot = p.temperature >= max - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-600">{Math.round(p.temperature)}°</span>
              <span
                className="w-full rounded-lg"
                style={{
                  height: `${h}px`,
                  background: hot ? 'linear-gradient(180deg,#f59e0b,#fbbf24)' : 'linear-gradient(180deg,#1d6af5,#60a5fa)',
                  opacity: 0.35 + (p.rainProb / 100) * 0.5
                }}
                title={`${Math.round(p.temperature)}°C, rain ${p.rainProb}%`}
              />
              <span className="text-[9px] text-slate-400">{p.label}</span>
              {p.rainProb >= 40 && <CloudRain className="h-3 w-3 text-brand-500" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
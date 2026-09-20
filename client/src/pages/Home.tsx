import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, UserCog, ShieldAlert, Sparkles, Wind as WindIcon, Droplets, Eye, Sun, Umbrella, Radio, Navigation, BellRing, FlaskConical } from 'lucide-react';
import { useApp, effectiveWarnings } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { personalize } from '../personalization/engine';
import { getPersona } from '../data/personas';
import { getLocationDef } from '../data/locations';
import { greeting, fmtTemp, fmtPercent, fmtNum } from '../utils/format';
import type { WeatherEnvelope } from '../types';
import { PageShell } from '../components/PageShell';
import { DataBadge } from '../components/DataBadge';
import { LocationPicker } from '../components/LocationPicker';
import { PersonaPicker } from '../components/PersonaPicker';
import { CardGrid } from '../components/cards/CardGrid';
import { PersonalizedInsight, CoreMessage } from '../components/PersonalizedInsight';

function weatherEmoji(cond: string | undefined): string {
  const c = (cond ?? '').toLowerCase();
  if (c.includes('thunder') || c.includes('storm')) return '⛈️';
  if (c.includes('rain') || c.includes('shower')) return '🌧️';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return '🌫️';
  if (c.includes('cloud') || c.includes('overcast')) return '☁️';
  if (c.includes('partly')) return '⛅';
  return '☀️';
}

/** Left / mobile hero: current observed conditions in one glance. */
function CurrentNow({ weather }: { weather: WeatherEnvelope | null }) {
  const { location, language, demoMode, profile } = useApp();
  const t = makeT(language);
  const locDef = getLocationDef(location);
  const c = weather?.current ?? null;
  const today = weather?.forecast?.[0] ?? null;
  const temp = c?.temperature ?? today?.tMax;
  const rainProb = today?.rainProb ?? 0;
  const dataMode = weather?.meta?.dataMode;
  const isSim = dataMode === 'fallback' || dataMode === 'demo';

  return (
    <section className="fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-brand-600 to-cyan-500 p-5 text-white shadow-card sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.15em] text-white/80">
            <MapPin className="h-3.5 w-3.5" /> {locDef ? `${locDef.name}, ${locDef.state}` : location}
          </p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-6xl font-black leading-none drop-shadow-sm">{fmtTemp(temp)}</span>
            <span className="pb-1 text-3xl" aria-hidden>
              {weatherEmoji(c?.weatherCondition)}
            </span>
          </div>
          <p className="mt-1 text-sm font-bold text-white/95">
            {c?.weatherCondition || today?.condition || t('common.overview')}
            {c?.feelsLike != null && ` · ${t('common.feelsLike')} ${fmtTemp(c.feelsLike)}`}
          </p>
        </div>
        {demoMode && <span className="chip bg-white/20 text-white ring-white/25">{t('common.demoMode')}</span>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[12px] font-semibold sm:grid-cols-4">
        <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-2">
          <Droplets className="h-3.5 w-3.5 text-cyan-200" />
          <span>
            {t('card.humidity')} <span className="font-extrabold">{fmtPercent(c?.humidity)}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-2">
          <WindIcon className="h-3.5 w-3.5 text-cyan-200" />
          <span>
            {t('card.wind')} <span className="font-extrabold">{Math.round(c?.windSpeed ?? 0)} km/h</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-2">
          <Eye className="h-3.5 w-3.5 text-cyan-200" />
          <span>
            {t('card.visibility')} <span className="font-extrabold">{fmtNum(c?.visibility, 1)} km</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-2.5 py-2">
          <Umbrella className={`h-3.5 w-3.5 ${rainProb >= 40 ? 'text-amber-200' : 'text-cyan-200'}`} />
          <span>
            {t('card.rain')} <span className="font-extrabold">{fmtPercent(rainProb)}</span>
          </span>
        </div>
      </div>

      {weather?.current?.stationName && (
        <p className="mt-3 text-[10px] font-semibold text-white/70">
          {t('data.source')}: {weather.current.stationName} {isSim ? ` · (${t('data.simulated')})` : ''}
        </p>
      )}
    </section>
  );
}

/** Warnings + live-at-a-glance panel (appears in the left column on desktop). */
function QuickView({ weather, t, onOpenAlerts }: { weather: WeatherEnvelope | null; t: (k: string) => string; onOpenAlerts: () => void }) {
  const warnings = weather?.warnings ?? [];
  const top = warnings[0];
  return (
    <div className="fade-up space-y-3">
      {top ? (
        <button
          onClick={onOpenAlerts}
          className="flex w-full items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-left transition-colors hover:bg-red-100"
        >
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-red-600">
              🚨 {t('card.severe_alert')} · {top.severity.toUpperCase()}
            </p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{top.event}</p>
            <p className="text-[11px] text-slate-500">
              {top.area} · {top.source === 'demo-simulation' ? t('demo.severeDemo') : 'IMD'}
            </p>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
          <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot" />
          <p className="text-xs font-bold text-emerald-700">{t('alerts.noActive')}</p>
        </div>
      )}
      <div className="rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-900/5">
        <p className="label-caps">{t('common.overview')}</p>
        <div className="mt-2 space-y-1.5 text-[13px] text-slate-700">
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">{t('common.feelsLike')}</span>
            <span className="font-bold">{fmtTemp(weather?.current?.feelsLike)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">{t('card.uv')}</span>
            <span className="font-bold">{t('ai.ans.na')}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">{t('common.wind')}</span>
            <span className="font-bold">
              {weather?.current?.windDirection || '--'} {Math.round(weather?.current?.windSpeed ?? 0)} km/h
            </span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">{t('card.rain_risk')} · {t('common.next24h')}</span>
            <span className="font-bold">{fmtPercent(weather?.forecast?.[0]?.rainProb)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Quick navigation shortcuts (right column on desktop). */
function QuickActions({ t }: { t: (k: string) => string }) {
  const nav = useNavigate();
  const short = [
    { id: 'radar', label: t('btn.openRadar'), icon: <Radio className="h-4 w-4" />, to: '/radar' },
    { id: 'satellite', label: t('btn.openSatellite'), icon: <Navigation className="h-4 w-4" />, to: '/satellite' },
    { id: 'alerts', label: t('alerts.title'), icon: <BellRing className="h-4 w-4" />, to: '/alerts' },
    { id: 'demo', label: t('demo.title'), icon: <FlaskConical className="h-4 w-4" />, to: '/demo' }
  ];
  return (
    <div className="fade-up rounded-2xl bg-white p-4 shadow-card ring-1 ring-slate-900/5">
      <p className="label-caps">{t('common.today')}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {short.map((s) => (
          <button key={s.id} onClick={() => nav(s.to)} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-left text-xs font-bold text-slate-700 ring-1 ring-slate-200/70 transition-colors hover:bg-brand-50 hover:text-brand-700">
            <span className="text-brand-500">{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Home() {
  const { persona, location, language, demoMode, severeSim, profile } = useApp();
  const t = makeT(language);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const nav = useNavigate();
  const p = getPersona(persona);
  const locDef = getLocationDef(location);
  const active = profile.personas.length ? profile.personas : [persona];

  const fetcher = () => api.weather(location, demoMode);
  const { data: weather, loading, updating, error, refetch } = useAsyncData<WeatherEnvelope>(fetcher, [location, demoMode]);

  const warnings = effectiveWarnings(weather?.warnings ?? [], demoMode, severeSim, locDef ? locDef.name : location);
  const result = personalize(weather, persona, active, profile.requirements, warnings);

  const greetingKey = greeting();
  const isSevereDemo = demoMode && severeSim;
  const displayName = profile.name?.trim() || p.label;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-5">
      <div className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t('app.tagline')}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {t(`hero.${greetingKey}`)}, <span className="text-brand-700">{displayName}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSevereDemo && (
            <span className="chip bg-red-50 text-red-700 ring-red-200">
              <ShieldAlert className="h-3.5 w-3.5" /> {t('demo.severeDemo')}
            </span>
          )}
          <button onClick={() => setPersonaOpen(true)} className="btn-secondary">
            <UserCog className="h-4 w-4" /> {t('btn.changePersona')}
          </button>
          <button onClick={() => setLocOpen(true)} className="btn-secondary">
            <MapPin className="h-4 w-4" /> {t('btn.changeLocation')}
          </button>
        </div>
      </div>

      <div className="mt-4">
        <DataBadge meta={weather?.meta ?? null} />
      </div>

      <PageShell loading={loading} updating={updating} error={error} onRetry={refetch}>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_280px]">
          {/* Severe banner: full width, must stay dominant */}
          {result.safetyActive && result.topWarning && (
            <div className="fade-up flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 lg:col-span-3">
              <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="text-xs font-extrabold uppercase tracking-wider text-red-600">
                  🚨 {t('card.severe_alert')} · {result.topWarning.severity.toUpperCase()}
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">{result.topWarning.event}</p>
                <p className="text-xs text-red-700">
                  {result.topWarning.area} ·{' '}
                  {result.topWarning.source === 'demo-simulation'
                    ? 'DEMO scenario (not an official IMD warning)'
                    : 'India Meteorological Department'}
                </p>
              </div>
              <button onClick={() => nav('/alerts')} className="btn-primary hidden !py-2 !text-xs sm:inline-flex">
                {t('ai.viewAlert')}
              </button>
            </div>
          )}

          {/* LEFT column: current conditions at a glance (mobile: lead hero) */}
          <div className="space-y-4 lg:col-start-1 lg:row-start-2">
            <CurrentNow weather={weather} />
            <QuickView weather={weather} t={t} onOpenAlerts={() => nav('/alerts')} />
          </div>

          {/* CENTER column: personalization + forecast/priority cards */}
          <div className="space-y-4 lg:col-start-2 lg:row-start-2">
            {weather && <PersonalizedInsight insight={result.recommendation} t={t} personaEmoji={p.emoji} personaLabel={p.label} />}
            <CardGrid weather={weather} result={result} demo={demoMode} t={t} persona={persona} getCardTitle={(id) => t(`card.${id}`)} />

            {result.insights.length > 0 && (
              <section className="fade-up">
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-extrabold uppercase tracking-wider text-slate-500">
                  <Sparkles className="h-4 w-4 text-brand-500" /> {t('common.insight')}
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {result.insights.map((ins, i) => (
                    <div key={i} className={`card p-4 ring-2 ${ins.tone === 'severe' ? 'ring-red-200' : ins.tone === 'caution' ? 'ring-amber-200' : 'ring-emerald-200'}`}>
                      <p className={`text-xs font-extrabold uppercase tracking-wider ${ins.tone === 'severe' ? 'text-red-600' : ins.tone === 'caution' ? 'text-amber-600' : ins.tone === 'positive' ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {ins.tone === 'severe' ? '⚠ SEVERE' : ins.tone === 'caution' ? '⚠ CAUTION' : ins.tone === 'positive' ? '✓ POSITIVE' : 'ℹ INFO'}
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{ins.headline}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{ins.text}</p>
                      <p className="mt-1.5 text-[10px] italic text-slate-400">{ins.basedOn}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT column: quick stats, shortcuts, core message */}
          <div className="space-y-4 lg:col-start-3 lg:row-start-2">
            <QuickActions t={t} />
            <CoreMessage t={t} />
            <div className="fade-up rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Sun className="h-3.5 w-3.5 text-amber-500" /> {locDef ? `${locDef.name}, ${locDef.state}` : location}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{t('hero.attribution')}</p>
            </div>
          </div>
        </div>
      </PageShell>

      <LocationPicker open={locOpen} onClose={() => setLocOpen(false)} />
      <PersonaPicker open={personaOpen} onClose={() => setPersonaOpen(false)} />
    </div>
  );
}
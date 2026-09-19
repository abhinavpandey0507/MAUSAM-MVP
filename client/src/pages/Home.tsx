import { useState } from 'react';
import { MapPin, UserCog, ShieldAlert, Sparkles } from 'lucide-react';
import { useApp, effectiveWarnings } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { personalize } from '../personalization/engine';
import { getPersona } from '../data/personas';
import { getLocationDef } from '../data/locations';
import { greeting, fmtTemp } from '../utils/format';
import type { WeatherEnvelope } from '../types';
import { PageShell } from '../components/PageShell';
import { DataBadge } from '../components/DataBadge';
import { LocationPicker } from '../components/LocationPicker';
import { PersonaPicker } from '../components/PersonaPicker';
import { CardGrid } from '../components/cards/CardGrid';
import { PersonalizedInsight, CoreMessage } from '../components/PersonalizedInsight';

export function Home() {
  const { persona, location, language, demoMode, severeSim, profile } = useApp();
  const t = makeT(language);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const p = getPersona(persona);
  const locDef = getLocationDef(location);
  const active = profile.personas.length ? profile.personas : [persona];

  const fetcher = () => api.weather(location, demoMode);
  const { data: weather, loading, updating, error, refetch } = useAsyncData<WeatherEnvelope>(fetcher, [location, demoMode]);

  const warnings = effectiveWarnings(weather?.warnings ?? [], demoMode, severeSim, locDef ? locDef.name : location);
  const result = personalize(weather, persona, active, profile.requirements, warnings);

  const greetingKey = greeting();
  const isSevereDemo = demoMode && severeSim;
  const getCardTitle = (id: string) => t(`card.${id}`);
  const displayName = profile.name?.trim() || p.label;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t('app.tagline')}</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {t(`hero.${greetingKey}`)}, <span className="text-brand-700">{displayName}</span>
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin className="h-4 w-4 text-brand-500" />
            {locDef.name}, {locDef.state}
            <span className="text-slate-300">·</span>
            {weather ? `${fmtTemp(weather.current?.temperature)} · ${weather.current?.weatherCondition || ''}` : ''}
          </p>
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
        {result.safetyActive && result.topWarning && (
          <div className="fade-up mt-4 flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3">
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
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {t('common.insight')} — personalization moves below this safety information.
              </p>
            </div>
          </div>
        )}

        {weather && (
          <div className="mt-4">
            <PersonalizedInsight insight={result.recommendation} t={t} personaEmoji={p.emoji} personaLabel={p.label} />
          </div>
        )}

        <div className="mt-4">
          <CardGrid weather={weather} result={result} demo={demoMode} t={t} persona={persona} getCardTitle={getCardTitle} />
        </div>

        {result.insights.length > 0 && (
          <section className="fade-up mt-6">
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

        <CoreMessage t={t} />
      </PageShell>

      <LocationPicker open={locOpen} onClose={() => setLocOpen(false)} />
      <PersonaPicker open={personaOpen} onClose={() => setPersonaOpen(false)} />
    </div>
  );
}
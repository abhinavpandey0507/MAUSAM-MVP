import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Beaker, ArrowRight, ShieldAlert, MapPin } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { api } from '../services/api';
import { PERSONAS } from '../data/personas';
import { LOCATIONS } from '../data/locations';
import type { PersonaId, LiveStatusInfo } from '../types';

interface StatusShape {
  imdV1: string;
  observationScrape: string;
  radarProducts: string;
  satelliteImagery: string;
  apiKeyConfigured: boolean;
}

export function Demo() {
  const { language, persona, location, demoMode, severeSim, setPersona, setLocation, setDemoMode, setSevereSim, profile, setPersonas } = useApp();
  const t = makeT(language);
  const nav = useNavigate();
  const [liveStatus, setLiveStatus] = useState<StatusShape | null>(null);

  useEffect(() => {
    api
      .status()
      .then((s) => setLiveStatus(s as StatusShape))
      .catch(() => {
        /* panel stays neutral */
      });
  }, []);

  const dot = (ok: boolean | null | undefined) => (
    <span
      className={`h-2 w-2 rounded-full ${
        ok === true ? 'bg-emerald-500 pulse-dot' : ok === false ? 'bg-red-500' : 'bg-amber-400'
      }`}
    />
  );

  const scenarios = [
    {
      id: 1,
      icon: '🏃',
      title: 'Runner → personalized homepage',
      desc: 'One click selects the runner persona and reorders the homepage.',
      run: () => {
        setPersona('runner');
        setDemoMode(false);
        setSevereSim(false);
        nav('/');
      }
    },
    {
      id: 2,
      icon: '🌾',
      title: 'Farmer → a different homepage',
      desc: 'Same weather data, completely different priority & cards.',
      run: () => {
        setPersona('farmer');
        setDemoMode(false);
        setSevereSim(false);
        nav('/');
      }
    },
    {
      id: 3,
      icon: '🚗',
      title: 'Commuter → different priority',
      desc: 'Rain risk, visibility and severe weather rise to the top.',
      run: () => {
        setPersona('commuter');
        setDemoMode(false);
        setSevereSim(false);
        nav('/');
      }
    },
    {
      id: 4,
      icon: '⚠️',
      title: 'Severe weather → alert overrides everything',
      desc: 'A demo warning moves to priority 0; personalization follows safety.',
      run: () => {
        setPersona('runner');
        setDemoMode(true);
        setSevereSim(true);
        nav('/');
      }
    },
    {
      id: 5,
      icon: '📍',
      title: 'Change location → live weather changes',
      desc: 'Pick a city; every screen refetches and personalization regenerates.',
      run: () => {
        setDemoMode(false);
        nav('/');
      }
    }
  ];

  const locationPicker = (id: string) => (
    <button
      key={id}
      onClick={() => setLocation(id)}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ring-1 transition-colors ${
        location === id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-brand-300'
      }`}
    >
      {LOCATIONS.find((l) => l.id === id)?.name}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <Beaker className="h-6 w-6 text-brand-600" /> {t('demo.title')}
          </h1>
          <p className="text-sm text-slate-500">{t('demo.subtitle')}</p>
        </div>
        <button onClick={() => setDemoMode(!demoMode)} className={`btn-secondary ${demoMode ? '!bg-amber-100 !text-amber-800 !ring-amber-300' : ''}`}>
          {t('common.demoMode')}: {demoMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Live status board */}
      <section className="card fade-up mt-4 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCell label="LIVE DATA" value={liveStatus ? (liveStatus.apiKeyConfigured ? 'IMD API KEY' : 'MIXED') : '—'} dot={liveStatus?.observationScrape === 'ok'} />
          <StatusCell label="IMD SOURCE" value="INDIA MET. DEPT." dot={liveStatus?.observationScrape === 'ok'} />
          <StatusCell label={t('demo.persona')} value={PERSONAS.find((p) => p.id === persona)?.label.toUpperCase() ?? '—'} dot />
          <StatusCell label={t('demo.location')} value={LOCATIONS.find((l) => l.id === location)?.name.toUpperCase() ?? '—'} dot />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-4">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
            {dot(liveStatus?.imdV1 === 'ok')} IMD API v1: {liveStatus ? liveStatus.imdV1 || 'untested' : '??'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
            {dot(liveStatus?.observationScrape === 'ok')} Observation: {liveStatus ? liveStatus.observationScrape : '??'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
            {dot(liveStatus?.radarProducts === 'ok')} Radar: {liveStatus ? liveStatus.radarProducts : '??'}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
            {dot(liveStatus?.satelliteImagery === 'ok')} Satellite: {liveStatus ? liveStatus.satelliteImagery : '??'}
          </span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          {dot(demoMode)} {t('demo.engine')}: {demoMode ? 'DEMO / FALLBACK SOURCE' : 'ACTIVE'} · safetyOverride: {severeSim ? 'ON' : 'OFF'}
        </p>
      </section>

      {/* Persona quick pick */}
      <section className="card fade-up mt-4 p-5">
        <h2 className="text-sm font-bold text-slate-900">{t('demo.persona')} — 14 roles</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersona(p.id as PersonaId)}
              className={`rounded-xl px-3.5 py-2 text-sm font-bold ring-2 transition-all ${
                persona === p.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-300'
              }`}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Active focus: {persona.toUpperCase()}</p>
      </section>

      {/* Multi-persona mode */}
      <section className="card fade-up mt-4 p-5">
        <h2 className="text-sm font-bold text-slate-900">Multi-persona mode — weighted average</h2>
        <p className="mt-1 text-xs text-slate-500">Select several roles at once; the homepage reorders by the averaged priority scores. Same weather — different needs.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PERSONAS.map((p) => {
            const on = profile.personas.includes(p.id as PersonaId);
            return (
              <button
                key={p.id}
                onClick={() => {
                  const list = on ? profile.personas.filter((x) => x !== p.id) : [...profile.personas, p.id as PersonaId];
                  setPersonas(list.length ? list : ['general']);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ring-2 transition-all ${
                  on ? 'bg-brand-50 text-brand-700 ring-brand-400' : 'bg-white text-slate-500 ring-slate-200 hover:ring-brand-300'
                }`}
              >
                {on ? '✓ ' : ''}
                {p.emoji} {p.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-brand-700">
          SAME WEATHER. DIFFERENT NEEDS. → {profile.personas.join(' + ')}
        </p>
      </section>

      {/* Location quick pick */}
      <section className="card fade-up mt-4 p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <MapPin className="h-4 w-4 text-brand-500" /> {t('demo.location')}
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">{LOCATIONS.map((l) => locationPicker(l.id))}</div>
      </section>

      {/* Scenarios */}
      <section className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={s.run}
            className="card card-hover fade-up group flex flex-col items-start gap-1 p-4 text-left"
          >
            <span className="text-2xl">{s.icon}</span>
            <div className="flex w-full items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500" />
            </div>
            <p className="text-xs text-slate-500">{s.desc}</p>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-500">
              2 clicks · {s.id === 4 ? 'demo severe' : s.id === 5 ? 'change location' : `persona: ${scenarioPersona(s.id)}`}
            </span>
          </button>
        ))}
      </section>

      {/* Severe demo toggle */}
      <section className={`card fade-up mt-4 p-5 ${severeSim ? 'ring-2 ring-amber-300' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`h-5 w-5 ${severeSim ? 'text-amber-600' : 'text-slate-300'}`} />
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t('demo.severeDemo')}</h2>
              <p className="text-xs text-slate-500">Demonstrates the priority-0 safety override of the personalization engine.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSevereSim(!severeSim);
              setDemoMode(true);
            }}
            className={`btn-secondary ${severeSim ? '!bg-amber-500 !text-white !ring-amber-500' : ''}`}
          >
            {severeSim ? 'ON · demo warning' : 'Off'}
          </button>
        </div>
        {severeSim && (
          <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
            A clearly-labelled demo warning is active on Home — the “Urgent Weather Warning” card now sits at priority 0, above all persona cards.
          </p>
        )}
      </section>

      <p className="mt-5 text-center text-[11px] italic text-slate-400">
        MAUSAM · Team THE_UNSCRIPTED · Smart India Hackathon 2026 (SIH26076)
      </p>
    </div>
  );
}

function StatusCell({ label, value, dot }: { label: string; value: string; dot: boolean | null | undefined }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
        <span
          className={`h-1.5 w-1.5 rounded-full ${dot === true ? 'bg-emerald-500 pulse-dot' : dot === false ? 'bg-red-400' : 'bg-amber-400'}`}
        />
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function scenarioPersona(id: number): string {
  return id === 1 ? 'runner' : id === 2 ? 'farmer' : id === 3 ? 'commuter' : id === 4 ? 'runner+safety' : '—';
}
import { useNavigate } from 'react-router-dom';
import { Compass, UserRound, Settings, Beaker, CloudSun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getPersona } from '../data/personas';
import { getLocationDef } from '../data/locations';
import { makeT } from '../i18n/translations';

export function TopBar() {
  const { persona, location, language, demoMode } = useApp();
  const t = makeT(language);
  const nav = useNavigate();
  const p = getPersona(persona);
  const loc = getLocationDef(location);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <button onClick={() => nav('/')} className="flex items-center gap-2.5 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 shadow-sm">
            <CloudSun className="h-6 w-6 text-white" />
          </span>
          <span>
            <span className="block text-[8px] font-bold leading-none uppercase tracking-[0.18em] text-slate-500">
              {t('brand.gov1')}
            </span>
            <span className="mb-1 block text-[8px] font-bold leading-none uppercase tracking-[0.14em] text-slate-500">
              {t('brand.gov2')}
            </span>
            <span className="block text-[17px] font-extrabold leading-none tracking-tight text-slate-900">
              {t('app.title')}
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-widest text-brand-600">
              {t('app.tagline')}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <span
            className={`chip hidden sm:inline-flex ${demoMode ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${demoMode ? 'bg-amber-500' : 'bg-emerald-500 pulse-dot'}`} />
            {demoMode ? t('common.demoMode') : t('data.live')}
          </span>
          <button
            onClick={() => nav('/demo')}
            className="chip bg-brand-50 text-brand-700 ring-brand-200 transition-colors hover:bg-brand-100"
            title="Judge demo"
          >
            <Beaker className="h-3.5 w-3.5" /> {t('nav.demo')}
          </button>
          <button
            onClick={() => nav('/settings')}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title={t('nav.settings')}
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => nav('/profile')}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title={t('nav.profile')}
          >
            <UserRound className="h-5 w-5" />
          </button>
          <button
            onClick={() => nav(`/profile`)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5 text-sm font-semibold text-slate-700"
          >
            <Compass className="h-4 w-4 text-brand-600" />
            <span className="max-w-[120px] truncate">{loc.name}</span>
          </button>
          <button title={`${t('persona.' + p.id)}`} className="hidden sm:inline-flex text-lg">
            {p.emoji}
          </button>
        </div>
      </div>
    </header>
  );
}
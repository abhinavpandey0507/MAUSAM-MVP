import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  UserRound,
  Settings,
  Beaker,
  CloudSun,
  Menu,
  X,
  CalendarRange,
  RadioTower,
  Radar,
  Satellite,
  ShieldAlert,
  History as HistoryIcon,
  Wind,
  Database,
  Info,
  LogOut,
  LogIn
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getPersona } from '../data/personas';
import { getLocationDef } from '../data/locations';
import { makeT } from '../i18n/translations';

const MENU = [
  { to: '/forecast', label: 'Forecast', Icon: CalendarRange },
  { to: '/nowcast', label: 'Nowcast', Icon: RadioTower },
  { to: '/history', label: 'History', Icon: HistoryIcon },
  { to: '/air-quality', label: 'Air Quality', Icon: Wind },
  { to: '/alerts', label: 'Alerts', Icon: ShieldAlert },
  { to: '/radar', label: 'Radar', Icon: Radar },
  { to: '/satellite', label: 'Satellite', Icon: Satellite },
  { to: '/demo', label: 'Judge demo', Icon: Beaker },
  { to: '/dataset', label: 'Dataset', Icon: Database },
  { to: '/about', label: 'About', Icon: Info }
];

export function TopBar() {
  const { persona, location, language, demoMode } = useApp();
  const { isAuthenticated, user, logout } = useAuth();
  const t = makeT(language);
  const nav = useNavigate();
  const routerLocation = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const p = getPersona(persona);
  const loc = getLocationDef(location);

  const go = (to: string) => {
    setMenuOpen(false);
    nav(to);
  };

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
            onClick={() => nav('/settings')}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title={t('nav.settings')}
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            onClick={() => nav(isAuthenticated ? '/profile' : '/auth')}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            title={isAuthenticated ? t('nav.profile') : 'Sign in'}
          >
            <UserRound className="h-5 w-5" />
          </button>
          <button
            onClick={() => nav('/')}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1.5 text-sm font-semibold text-slate-700"
          >
            <Compass className="h-4 w-4 text-brand-600" />
            <span className="max-w-[120px] truncate">{loc.name}</span>
          </button>
          <button title={`${t('persona.' + p.id)}`} className="hidden sm:inline-flex text-lg">
            {p.emoji}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="relative rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute right-3 top-full z-40 w-60 origin-top-right rounded-2xl border border-slate-200 bg-white p-2 shadow-card-hover fade-up">
            <div className="px-2.5 py-1.5">
              <p className="label-caps">Browse</p>
            </div>
            <div className="grid grid-cols-1">
              {MENU.map(({ to, label, Icon }) => (
                <button
                  key={to}
                  onClick={() => go(to)}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold transition-colors ${
                    routerLocation.pathname === to ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4 text-slate-400" /> {label}
                </button>
              ))}
            </div>
            <div className="my-1 border-t border-slate-100" />
            {isAuthenticated ? (
              <>
                <div className="px-2.5 py-1.5">
                  <p className="truncate text-xs font-semibold text-slate-700">{user?.displayName || user?.email}</p>
                </div>
                <button
                  onClick={() => go('/profile')}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <UserRound className="h-4 w-4 text-slate-400" /> Profile
                </button>
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                    nav('/');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => go('/auth')}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                <LogIn className="h-4 w-4" /> Sign in / Register
              </button>
            )}
          </div>
        </>
      )}
    </header>
  );
}

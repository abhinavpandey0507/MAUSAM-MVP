import { NavLink } from 'react-router-dom';
import { Home, CalendarRange, Radar, RadioTower, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';

const ITEMS = [
  { to: '/', labelKey: 'nav.home', Icon: Home },
  { to: '/forecast', labelKey: 'nav.forecast', Icon: CalendarRange },
  { to: '/nowcast', labelKey: 'nav.nowcast', Icon: RadioTower },
  { to: '/radar', labelKey: 'nav.radar', Icon: Radar },
  { to: '/alerts', labelKey: 'nav.alerts', Icon: ShieldAlert }
];

export function BottomNav() {
  const { language } = useApp();
  const t = makeT(language);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-stretch justify-around">
        {ITEMS.map(({ to, labelKey, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                isActive ? 'text-brand-700' : 'text-slate-400 hover:text-slate-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-[22px] w-[22px] ${isActive ? 'text-brand-600' : ''}`} strokeWidth={isActive ? 2.4 : 2} />
                {t(labelKey)}
                <span className={`h-1 w-6 rounded-full transition-colors ${isActive ? 'bg-brand-500' : 'bg-transparent'}`} />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
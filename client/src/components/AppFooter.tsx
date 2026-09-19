import { CloudSun, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';

export function AppFooter() {
  const { language } = useApp();
  const t = makeT(language);

  return (
    <footer className="mt-8 border-t border-slate-200/80 bg-white/70">
      <div className="mx-auto max-w-5xl px-4 py-6 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <span className="flex items-center gap-2 text-sm font-extrabold tracking-tight text-slate-900">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-900">
              <CloudSun className="h-4 w-4 text-white" />
            </span>
            {t('app.title')}
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-brand-600">{t('app.tagline')}</span>
          </span>
          <p className="text-[11px] font-semibold text-slate-600">{t('brand.govFull')}</p>
          <p className="text-[11px] text-slate-500">{t('brand.dataService')}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
          <span>{t('brand.prototype')}</span>
          <span>·</span>
          <span>{t('app.team')}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> {t('brand.notOfficial')}
          </span>
        </div>
      </div>
    </footer>
  );
}
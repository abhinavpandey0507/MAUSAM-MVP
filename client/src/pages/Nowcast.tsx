import { RadioTower, ExternalLink, Clock4, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { PageShell } from '../components/PageShell';
import { DataBadge } from '../components/DataBadge';
import { fmtTime } from '../utils/format';
import type { WeatherEnvelope } from '../types';

const SEV_STYLE: Record<string, string> = {
  no_warning: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  watch: 'bg-amber-50 text-amber-700 ring-amber-200',
  alert: 'bg-orange-50 text-orange-700 ring-orange-200',
  warning: 'bg-red-50 text-red-700 ring-red-200'
};

export function Nowcast() {
  const { location, language, demoMode } = useApp();
  const t = makeT(language);

  const { data: weather, loading, updating, error, refetch } = useAsyncData<WeatherEnvelope>(
    () => api.weather(location, demoMode),
    [location, demoMode]
  );

  const items = weather?.nowcast ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <RadioTower className="h-6 w-6 text-brand-600" /> {t('nav.nowcast')}
          </h1>
          <p className="text-sm text-slate-500">{weather?.location ?? ''} · next ~3 hours</p>
        </div>
        <a
          href="https://mausam.imd.gov.in/responsive/districtWiseNowcastGIS.php"
          target="_blank"
          rel="noreferrer"
          className="btn-secondary"
        >
          <ExternalLink className="h-4 w-4" /> {t('btn.viewOnImd')}
        </a>
      </div>

      <div className="mt-4">
        <DataBadge meta={weather?.meta ?? null} />
      </div>

      <PageShell loading={loading} updating={updating} error={error} onRetry={refetch}>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.length === 0 && (
            <div className="card col-span-full p-6 text-center text-sm text-slate-500">
              No official nowcast bulletins returned for this location.
            </div>
          )}
          {items.map((n, i) => (
            <div key={i} className="card fade-up p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">{n.location}</p>
                  <p className="text-xs text-slate-500">{n.type}</p>
                </div>
                <span className={`chip ${SEV_STYLE[n.severity] ?? SEV_STYLE.no_warning}`}>{n.severity.replace('_', ' ').toUpperCase()}</span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{n.description}</p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Clock4 className="h-3.5 w-3.5" /> {fmtTime(n.validFrom)} → {fmtTime(n.validUntil)} IST
                </span>
                {n.source !== 'simulated' && n.source !== 'demo-simulation' && (
                  <span className="inline-flex items-center gap-1 text-emerald-600">
                    <ShieldCheck className="h-3.5 w-3.5" /> IMD
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] italic text-slate-400">{t('alerts.source')}</p>
      </PageShell>
    </div>
  );
}
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { PageShell } from '../components/PageShell';
import { DataBadge } from '../components/DataBadge';
import { fmtTime } from '../utils/format';
import type { WeatherEnvelope } from '../types';

const SEV_RANK: Record<string, number> = { no_warning: 0, watch: 1, alert: 2, warning: 3 };

const SEV_META: Record<string, { label: string; style: string; desc: string }> = {
  warning: {
    label: 'WARNING',
    style: 'bg-red-50 text-red-700 ring-red-300',
    desc: 'Severe weather expected. Act now - take safety actions.'
  },
  alert: {
    label: 'ALERT',
    style: 'bg-orange-50 text-orange-700 ring-orange-300',
    desc: 'Severe weather likely. Be prepared and stay informed.'
  },
  watch: {
    label: 'WATCH',
    style: 'bg-amber-50 text-amber-700 ring-amber-300',
    desc: 'Conditions are favourable. Be alert and monitor updates.'
  },
  no_warning: {
    label: 'NO WARNING',
    style: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    desc: 'No hazardous weather expected.'
  }
};

export function Alerts() {
  const { location, language, demoMode, severeSim } = useApp();
  const t = makeT(language);

  const { data: weather, loading, updating, error, refetch } = useAsyncData<WeatherEnvelope>(
    () => api.weather(location, demoMode),
    [location, demoMode]
  );

  const warnings = weather?.warnings ?? [];
  const highest = warnings.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity])[0];
  const topSeverity = highest?.severity ?? 'no_warning';
  const meta = SEV_META[topSeverity] ?? SEV_META.no_warning;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <ShieldAlert className="h-6 w-6 text-brand-600" /> {t('alerts.title')}
          </h1>
          <p className="text-sm text-slate-500">{weather?.location ?? ''} · watch → alert → warning hierarchy</p>
        </div>
        <a
          href="https://mausam.imd.gov.in/responsive/districtWiseWarningGIS.php"
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
        {/* Overall status panel */}
        <section className={`fade-up card mt-4 p-5 ring-2 ${meta.style}`}>
          <div className="flex items-center gap-3">
            <span className={`rounded-2xl px-4 py-2 text-lg font-extrabold ring-2 ${meta.style}`}>{t(`alerts.${topSeverity}`)}</span>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {warnings.length ? 'Official warning in effect' : t('alerts.noActive')}
              </p>
              <p className="text-xs text-slate-600">{meta.desc}</p>
            </div>
          </div>
          {topSeverity !== 'no_warning' && (
            <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-xs text-slate-700">
              The personalization engine will surface this warning above all normal content (priority-0 safety override).
            </p>
          )}
        </section>

        {/* Warning cards */}
        <div className="mt-4 space-y-3">
          {warnings.length === 0 && (
            <div className="card p-5 text-center text-sm text-slate-500">
              ✅ {t('alerts.noActive')}
              <p className="mt-1 text-xs text-slate-400">{t('alerts.source')}</p>
            </div>
          )}
          {warnings.map((w, i) => {
            const sev = SEV_META[w.severity] ?? SEV_META.no_warning;
            const demo = w.source === 'demo-simulation';
            return (
              <div key={i} className={`card fade-up p-4 ${demo ? 'ring-2 ring-amber-300' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`chip ${sev.style}`}>{t(`alerts.${w.severity}`)}</span>
                    <h3 className="mt-2 text-base font-bold text-slate-900">{w.event}</h3>
                    <p className="text-xs text-slate-500">{w.area} · {t('alerts.source')}</p>
                    {w.detail && <p className="mt-1.5 text-sm text-slate-600">{w.detail}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                  <span>Valid {fmtTime(w.validFrom)} → {fmtTime(w.validUntil)} IST</span>
                  {demo && <span className="font-bold uppercase text-amber-600">Demo scenario</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Safety override demo hint */}
        {demoMode && (
          <p className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
            💡 Demo mode is active. Use “Simulate severe warning” on the Home screen or /demo to demonstrate the priority-0 safety override.
          </p>
        )}

        <p className="mt-4 text-center text-[11px] italic text-slate-400">
          {t('alerts.source')} · Warnings are never fabricated as live. Demo warnings are labelled.
        </p>
      </PageShell>
    </div>
  );
}
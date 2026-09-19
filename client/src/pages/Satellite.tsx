import { useState } from 'react';
import { Satellite, ExternalLink, RefreshCw, Radar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { fmtTime } from '../utils/format';
import type { SatelliteInfo } from '../types';

export function SatellitePage() {
  const { language } = useApp();
  const t = makeT(language);
  const { data, loading, error, refetch, updating } = useAsyncData<SatelliteInfo | null>(() => api.satellite(), []);
  const sat = data;
  const [cached, setCached] = useState(false);

  const onError = () => setCached(true);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <Satellite className="h-6 w-6 text-brand-600" /> {t('nav.satellite')}
          </h1>
          <p className="text-sm text-slate-500">
            {sat ? sat.product : 'INSAT-3D / 3DR satellite imagery'}
          </p>
        </div>
        {sat && (
          <a href={sat.satellitePage} target="_blank" rel="noreferrer" className="btn-primary">
            <ExternalLink className="h-4 w-4" /> {t('btn.openSatellite')}
          </a>
        )}
      </div>

      {sat && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot" />
          {t('data.live')} · {sat.provider} · refreshed every {sat.updatedEveryMinutes} min · {fmtTime(sat.lastUpdated)}
        </div>
      )}

      {loading && <div className="card mt-4 h-80 animate-pulse" />}
      {error && <div className="card mt-4 p-5 text-sm text-red-600">{error}</div>}

      {!loading && !sat && (
        <div className="card mt-4 p-6">
          <p className="text-sm font-semibold text-slate-700">IMD satellite imagery unreachable from this network.</p>
          <p className="mt-1 text-sm text-slate-500">
            Satellite imagery is never fabricated. Open the official IMD satellite pages below.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn-secondary" href="https://mausam.imd.gov.in/imd_latest/contents/satellite.php" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> INSAT-3D satellite
            </a>
            <a className="btn-secondary" href="https://mausam.imd.gov.in/imd_latest/contents/rapidscan.php" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> INSAT-3DR rapid scan
            </a>
          </div>
        </div>
      )}

      {sat && (
        <div className="mt-4 space-y-4">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{sat.product}</h2>
                <p className="text-[11px] text-slate-400">Official INSAT-3D/3DR Asia Sector IR-1 visible channel</p>
              </div>
              <button onClick={refetch} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="relative bg-black">
              <img
                src={sat.imageUrl}
                alt="INSAT-3D Asia sector IR-1"
                className="mx-auto w-full max-w-2xl"
                onError={onError}
              />
              <span className="absolute left-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                {cached ? 'recent frame' : 'latest frame'} · INSAT-3D IR-1
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <a href={sat.rapidscanPage} target="_blank" rel="noreferrer" className="btn-secondary">
                <Radar className="h-4 w-4" /> Rapid scan (ISC)
              </a>
              <a href={sat.satellitePage} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">
                {t('btn.viewOnImd')} →
              </a>
            </div>
          </section>

          <p className="text-center text-[11px] italic text-slate-400">
            {t('hero.attribution')} · INSAT-3D/3DR satellite data, Ministry of Earth Sciences
          </p>
        </div>
      )}
    </div>
  );
}
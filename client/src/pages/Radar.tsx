import { useState } from 'react';
import { Radar, ExternalLink, RefreshCw, PlayCircle, CloudRain, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { DataBadge } from '../components/DataBadge';
import { fmtTime } from '../utils/format';
import type { RadarInfo } from '../types';

export function RadarPage() {
  const { location, language } = useApp();
  const t = makeT(language);
  const [product, setProduct] = useState<'sri' | 'maxz'>('sri');

  const { data, loading, updating, error, refetch } = useAsyncData<RadarInfo | null>(() => api.radar(location), [location]);

  const radar = data;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <Radar className="h-6 w-6 text-brand-600" /> {t('nav.radar')}
          </h1>
          <p className="text-sm text-slate-500">
            {radar ? `${radar.station} (${radar.radarCode})` : location} · Doppler Weather Radar products
          </p>
        </div>
        {(radar?.sri || radar?.mosaicPage) && (
          <a href={radar?.mosaicPage ?? '#'} target="_blank" rel="noreferrer" className="btn-primary">
            <ExternalLink className="h-4 w-4" /> {t('btn.openRadar')}
          </a>
        )}
      </div>

      {radar && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot" />
          {t('data.live')} · {radar.provider} · {fmtTime(radar.lastUpdated)}
        </div>
      )}

      <div className="mt-4">
        <DataBadge meta={null} />
      </div>

      {loading && <div className="card mt-4 h-80 animate-pulse" />}

      {error && (
        <div className="card mt-4 p-5 text-sm text-red-600">{error}</div>
      )}

      {!loading && !radar && (
        <div className="card mt-4 p-6">
          <p className="text-sm font-semibold text-slate-700">IMD radar products unreachable from this network.</p>
          <p className="mt-1 text-sm text-slate-500">
            Radar imagery is never fabricated. Open the official IMD radar pages below — they include live products and 3-hour animations.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn-secondary" href="https://mausam.imd.gov.in/imd_latest/contents/index_mosaic.php" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Radar mosaic
            </a>
            <a className="btn-secondary" href="https://mausam.imd.gov.in/imd_latest/contents/index_radar.php" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> All radars
            </a>
          </div>
        </div>
      )}

      {radar && (
        <div className="mt-4 space-y-4">
          {/* Product selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setProduct('sri')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${product === 'sri' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
            >
              <CloudRain className="h-4 w-4" /> SRI (Rain intensity)
            </button>
            <button
              onClick={() => setProduct('maxz')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${product === 'maxz' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}
            >
              <Layers className="h-4 w-4" /> MAXZ (Max reflectivity)
            </button>
          </div>

          {/* Live radar animation */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {product === 'sri' ? 'Surface Rainfall Intensity' : 'Maximum Reflectivity'} — {radar.station}
                </h2>
                <p className="text-[11px] text-slate-400">Live animated loop from IMD Doppler Weather Radar · updated every ~7 min</p>
              </div>
              <button onClick={refetch} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Refresh">
                <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="relative bg-slate-900">
              <img
                key={`${radar.radarCode}-${product}`}
                src={product === 'sri' ? radar.sri : radar.maxz}
                alt={`${radar.station} ${product} radar`}
                className="mx-auto w-full max-w-xl"
              />
              <span className="absolute left-3 top-3 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur">
                {radar.radarCode} · {product}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <a href={radar.animationPage} target="_blank" rel="noreferrer" className="btn-secondary">
                <PlayCircle className="h-4 w-4" /> {t('btn.threeHour')}
              </a>
              <a href={radar.radarPage} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">
                {t('btn.viewOnImd')} →
              </a>
            </div>
          </section>

          <p className="text-center text-[11px] italic text-slate-400">
            {t('hero.attribution')} · Radar product: {programLabel()}
          </p>
        </div>
      )}
    </div>
  );
}

function programLabel() {
  return 'SWR (Station Weather Radar) / Doppler Weather Radar (DWR) product stream';
}
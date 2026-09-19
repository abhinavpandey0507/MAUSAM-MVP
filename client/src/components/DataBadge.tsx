import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { fmtTime } from '../utils/format';
import type { WeatherMeta } from '../types';

function liveStyle(mode: string) {
  if (mode === 'demo') return { bg: 'bg-amber-50', ring: 'ring-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' };
  if (mode === 'live') return { bg: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' };
  return { bg: 'bg-sky-50', ring: 'ring-sky-200', text: 'text-sky-700', dot: 'bg-sky-500' };
}

export function DataBadge({ meta, compact }: { meta: WeatherMeta | null; compact?: boolean }) {
  const { language } = useApp();
  const t = makeT(language);
  if (!meta) return null;
  const s = liveStyle(meta.dataMode);

  const label =
    meta.dataMode === 'demo'
      ? t('data.demo')
      : meta.dataMode === 'live'
        ? t('data.live')
        : meta.imdUnavailable
          ? t('data.simulated')
          : t('data.live');

  const live = s.dot === 'bg-emerald-500';

  return (
    <div className={`inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl ${s.bg} px-3 py-1.5 text-xs font-medium ${s.text} ring-1 ${s.ring}`}>
      <span className="inline-flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${s.dot} ${live ? 'pulse-dot' : ''}`} />
        {label}
      </span>
      {!compact && meta.lastUpdated && (
        <span className="inline-flex items-center gap-1.5">
          <span className="opacity-70">{t('data.lastUpdated')}:</span>
          <span className="font-semibold">{fmtTime(meta.lastUpdated)}</span>
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <span className="opacity-70">{t('data.source')}:</span>
        <span className="font-semibold">India Meteorological Department</span>
      </span>
    </div>
  );
}
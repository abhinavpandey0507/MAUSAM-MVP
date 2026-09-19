import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';

export function PageShell({
  loading,
  updating,
  error,
  onRetry,
  children
}: {
  loading: boolean;
  updating: boolean;
  error: string | null;
  onRetry: () => void;
  children: ReactNode;
}) {
  const { language } = useApp();
  const t = makeT(language);

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-28 animate-pulse p-4">
            <div className="h-3 w-1/3 rounded bg-slate-100" />
            <div className="mt-3 h-10 w-1/2 rounded bg-slate-100" />
          </div>
        ))}
        <p className="text-center text-sm text-slate-400">{t('common.loading')}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-bold">IMD data temporarily unavailable.</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
          </div>
          <button onClick={onRetry} className="btn-secondary !py-2 text-xs">
            <RefreshCw className="h-4 w-4" /> {t('err.retry')}
          </button>
        </div>
      )}

      {updating && !error && (
        <div className="flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
          <Sparkles className="h-4 w-4 animate-pulse" />
          {t('data.updateInProgress')}
        </div>
      )}

      {children}
    </div>
  );
}
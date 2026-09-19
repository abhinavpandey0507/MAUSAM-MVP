import { Sparkles, Clock, ChevronRight } from 'lucide-react';
import type { PersonalizedInsight } from '../types';
import { WhyButton } from './WhyButton';

export function PersonalizedInsight({
  insight,
  t,
  personaEmoji,
  personaLabel
}: {
  insight: PersonalizedInsight;
  t: (k: string) => string;
  personaEmoji: string;
  personaLabel: string;
}) {
  return (
    <section className="fade-up relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500 p-5 text-white shadow-card sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" /> {t('insight.title')}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold">
          {personaEmoji} {personaLabel}
        </span>
      </div>

      <h2 className="mt-3 text-xl font-extrabold leading-tight sm:text-2xl">{insight.headline}</h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/85">{insight.text}</p>

      {insight.window && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 px-3.5 py-2 text-sm font-bold shadow-sm">
          <Clock className="h-4 w-4" /> {t('insight.recommended')}: {insight.window}
        </div>
      )}

      {insight.bullets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {insight.bullets.map((b, i) => (
            <span key={i} className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/95">
              {b}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <WhyButton reasons={insight.why} title={`${t('insight.forYou')} · ${personaLabel}`} />
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/70">
          {t('insight.basedOn')} · {insight.note}
        </span>
      </div>
    </section>
  );
}

export function CoreMessage({ t }: { t: (k: string) => string }) {
  return (
    <div className="fade-up mt-3 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-center">
      <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-brand-700">{t('home.coreMessage')}</p>
      <p className="mt-1 text-[11px] text-slate-500">{t('home.coreSub')}</p>
    </div>
  );
}

export function AllWeatherLink({ t, onShow }: { t: (k: string) => string; onShow: () => void }) {
  return (
    <button
      onClick={onShow}
      className="fade-up mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:text-brand-700"
    >
      <span>{t('home.allWeather')}</span>
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}
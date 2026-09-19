import { useState } from 'react';
import { HelpCircle, CheckCircle2, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import type { WhyFactor } from '../types';
import { Modal } from './Modal';

export function WhyButton({ reasons, title }: { reasons: WhyFactor[]; title: string }) {
  const { language } = useApp();
  const t = makeT(language);
  const [open, setOpen] = useState(false);
  if (!reasons?.length) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 ring-1 ring-brand-100 transition-colors hover:bg-brand-100"
        title={t('btn.why')}
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {t('btn.why')}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`${title}`} wide>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{t('card.' + title) || title}</p>
          <ul className="space-y-2.5">
            {reasons.map((f, i) => (
              <li
                key={i}
                className={`flex items-start gap-2.5 rounded-xl p-3 text-sm ${
                  f.ok ? 'bg-emerald-50/70 text-slate-800' : 'bg-amber-50/60 text-slate-700'
                }`}
              >
                {f.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400">MAUSAM · {t('common.basedOn')}</p>
        </div>
      </Modal>
    </>
  );
}
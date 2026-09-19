import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  wide
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className={`relative w-full fade-up rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl max-h-[88vh] overflow-auto ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export interface PersonaOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  accent: string;
}

export function PersonaGrid({ options, current, onSelect, t }: { options: PersonaOption[]; current: string; onSelect: (id: string) => void; t: (k: string) => string }) {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {options.map((p) => {
        const active = p.id === current;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all ${
              active ? 'border-brand-500 bg-brand-50 shadow-card-hover' : 'border-slate-200 bg-white hover:border-brand-300'
            }`}
          >
            <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${p.accent} text-xl shadow-sm`}>
              {p.emoji}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-900">{p.label}</span>
              <span className="block text-xs text-slate-500">{p.description}</span>
            </span>
            {active && <span className="chip bg-brand-600 text-white ring-brand-600">✓ {t('demo.active')}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function MultiPersonaGrid({
  options,
  selected,
  onToggle,
  t
}: {
  options: PersonaOption[];
  selected: string[];
  onToggle: (id: string) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5">
      {options.map((p) => {
        const active = selected.includes(p.id);
        return (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            aria-pressed={active}
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all ${
              active ? 'border-brand-500 bg-brand-50 shadow-card-hover' : 'border-slate-200 bg-white hover:border-brand-300'
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.accent} text-lg shadow-sm`}>
              {p.emoji}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-slate-900">{p.label}</span>
              <span className="block text-[11px] text-slate-500">{p.description}</span>
            </span>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white text-transparent'
              }`}
            >
              ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}
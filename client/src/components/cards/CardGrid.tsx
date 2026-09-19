import type { ComponentType } from 'react';
import type {
  PersonalizationResult,
  WeatherEnvelope,
  PersonaId,
  WhyFactor
} from '../../types';
import type { Warning } from '../../types';
import { CARD_RENDERERS, CARD_ICONS } from './cards';
import { WhyButton } from '../WhyButton';

export type CardId = string;
export type LanguageT = (k: string) => string;

export interface CardShellProps {
  cardId: string;
  title: string;
  Icon: ComponentType<{ className?: string }>;
  children: React.ReactNode;
  reasons: WhyFactor[];
  accent?: string;
  badge?: React.ReactNode;
}

export function CardShell({ cardId, title, Icon, children, reasons, accent, badge }: CardShellProps) {
  const ring =
    cardId === 'severe_alert'
      ? 'ring-red-300'
      : cardId === 'severe_weather' && badge
        ? 'ring-amber-300'
        : 'ring-slate-900/5';
  return (
    <section className={`card card-hover fade-up p-4 ring-2 md:p-5 ${ring}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent ?? 'bg-brand-50 text-brand-600'}`}>
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <WhyButton reasons={reasons} title={cardId} />
        </div>
      </div>
      {children}
    </section>
  );
}

export function CardGrid({
  weather,
  result,
  demo,
  t,
  persona,
  getCardTitle
}: {
  weather: WeatherEnvelope | null;
  result: PersonalizationResult;
  demo: boolean;
  t: LanguageT;
  persona: PersonaId;
  getCardTitle: (id: string) => string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {result.cards.map((card) => {
        const Icon = CARD_ICONS[card.id] ?? CARD_ICONS.generic;
        const renderer = CARD_RENDERERS[card.id];
        const body = renderer
          ? renderer({ weather, persona, demo, t }, result)
          : null;
        return (
          <CardShell
            key={card.id}
            cardId={card.id}
            title={getCardTitle(card.id)}
            Icon={Icon}
            reasons={card.reason}
            accent={card.id === 'outdoor_window' ? 'bg-gradient-to-br from-brand-500 to-cyan-400 text-white' : undefined}
            badge={card.id === 'severe_alert' ? <WarningBadge warning={result.topWarning} /> : undefined}
          >
            {body}
          </CardShell>
        );
      })}
    </div>
  );
}

function WarningBadge({ warning }: { warning: Warning | null }) {
  if (!warning) return null;
  const colors: Record<string, string> = {
    watch: 'bg-amber-100 text-amber-800 ring-amber-300',
    alert: 'bg-orange-100 text-orange-800 ring-orange-300',
    warning: 'bg-red-100 text-red-800 ring-red-300'
  };
  return (
    <span className={`chip ${colors[warning.severity] ?? colors.alert}`}>{warning.severity.toUpperCase()}</span>
  );
}
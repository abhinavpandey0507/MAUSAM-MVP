import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudSun, Mic, Send, X, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { getLocationDef } from '../data/locations';
import { getPersona } from '../data/personas';
import { greeting } from '../utils/format';
import type { WeatherEnvelope } from '../types';
import { buildMausamAiContext, answerIntent, QUICK_QUESTIONS, intentFromText, INTENT_LABEL_KEY, type AiIntent, type MausamAiContext } from '../ai/mausamAi';

interface Message {
  id: number;
  role: 'ai' | 'user';
  text: string;
  intent?: AiIntent;
  basis?: string[];
  voice?: boolean;
  warning?: boolean;
}

let msgSeq = 1;

export function MausamAi() {
  const { persona, location, language, demoMode, severeSim, profile } = useApp();
  const t = makeT(language);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [proactive, setProactive] = useState<{ text: string; intent: AiIntent } | null>(null);
  const [expandedWhy, setExpandedWhy] = useState<Record<number, boolean>>({});

  const locDef = getLocationDef(location);
  const p = getPersona(persona);

  const fetcher = useCallback(() => api.weather(location, demoMode), [location, demoMode]);
  const { data: weather } = useAsyncData<WeatherEnvelope>(fetcher, [location, demoMode]);

  const gk = greeting();
  const greetWord = t(`hero.${gk}`);

  const ctx: MausamAiContext = useMemo(
    () =>
      buildMausamAiContext({
        weather,
        name: profile.name.trim(),
        persona,
        personas: profile.personas,
        requirements: profile.requirements,
        locationId: location,
        locationLabel: locDef ? locDef.name : location,
        demoMode,
        severeSim
      }),
    [weather, profile.name, persona, profile.personas, profile.requirements, location, locDef, demoMode, severeSim]
  );

  const safety = ctx.safetyActive && !!ctx.topWarning;
  const personaLabel = getPersona(persona).label;

  const push = useCallback((m: Omit<Message, 'id'>) => {
    setMessages((prev) => [...prev.slice(-19), { ...m, id: msgSeq++ }]);
  }, []);

  const ask = useCallback(
    (intent: AiIntent) => {
      const ans = answerIntent(intent, ctx);
      push({ role: 'user', text: t(INTENT_LABEL_KEY[intent]), intent });
      push({ role: 'ai', text: ans.text, intent: ans.intent, basis: ans.basis, warning: intent === 'explain_warning' });
    },
    [ctx, push, t]
  );

  const handleSend = useCallback(() => {
    const raw = input.trim();
    if (!raw) return;
    const intent = intentFromText(raw);
    const ans = answerIntent(intent, ctx);
    push({ role: 'user', text: raw, intent });
    push({ role: 'ai', text: ans.text, intent: ans.intent, basis: ans.basis, warning: ans.intent === 'explain_warning' });
    setInput('');
  }, [input, ctx, push]);

  // Greeting on open (and re-greet when persona changes while open).
  const lastPersona = useRef(persona);
  useEffect(() => {
    if (!open) return;
    if (messages.length === 0 || lastPersona.current !== persona) {
      const ans = answerIntent('greeting', ctx);
      push({ role: 'ai', text: `${greetWord}, ${profile.name.trim() || 'there'} ☀️\n\n${ans.text}`, intent: 'greeting', basis: ans.basis });
      lastPersona.current = persona;
    }
  }, [open, messages.length === 0, persona, ctx, push, greetWord, profile.name]);

  // Proactive insight: max 1 at a time, calm, dismissible.
  const proactiveRef = useRef<{ shownAt: number; last: string } | null>(null);
  useEffect(() => {
    if (open) return;
    const now = Date.now();
    const last = proactiveRef.current;
    if (last && now - last.shownAt < 45000 && last.last === (safety ? 'warn' : 'ok')) return;
    const timer = setTimeout(() => {
      const base = profile.name.trim() || personaLabel;
      let text = '';
      let intent: AiIntent = 'best_time';
      if (safety) {
        text = `⚠️ New weather warning detected.\nTap to view.`;
        intent = 'explain_warning';
      } else if (ctx.tomorrow && ctx.today && (ctx.tomorrow.rainProb ?? 0) > (ctx.today.rainProb ?? 0) + 15) {
        text = `Hey ${base} 👋\nRain probability increases ${ctx.tomorrow.weekday}. Want the best outdoor window?`;
        intent = 'best_time';
      } else {
        text = `Hey ${base} 👋\nWant your recommended window for today?`;
        intent = 'best_time';
      }
      setProactive({ text, intent });
      proactiveRef.current = { shownAt: Date.now(), last: safety ? 'warn' : 'ok' };
      setTimeout(() => setProactive(null), 8000);
    }, 6000);
    return () => clearTimeout(timer);
  }, [open, safety, ctx, profile.name, personaLabel]);

  useEffect(() => {
    if (!safety) return;
    setProactive({ text: `⚠️ New weather warning detected.\nTap to view.`, intent: 'explain_warning' });
  }, [safety]);

  const openPanel = useCallback(() => {
    setOpen(true);
    setProactive(null);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setProactive(null);
  }, []);

  const onVoice = useCallback(() => {
    push({ role: 'ai', text: t('ai.voice'), voice: true });
  }, [push, t]);

  const sourceLabel = ctx.dataMode === 'fallback' || ctx.dataMode === 'demo' ? t('ai.statusFallback') : t('ai.statusOk');
  const sourceIsLive = ctx.dataMode !== 'fallback' && ctx.dataMode !== 'demo';

  return (
    <>
      {/* Floating button */}
      <button
        onClick={openPanel}
        className={`fixed bottom-[86px] right-3 z-[55] flex items-center gap-2 rounded-full py-2 pl-2.5 pr-4 text-sm font-bold shadow-card transition-all hover:scale-[1.03] sm:right-6 ${
          safety ? 'ai-ring bg-red-600 text-white' : 'bg-gradient-to-br from-brand-600 to-cyan-500 text-white'
        }`}
        aria-label={t('ai.ask')}
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${safety ? 'bg-red-500/80' : 'bg-white/15'}`}>
          {safety ? <ShieldAlert className="h-5 w-5" /> : <CloudSun className="h-5 w-5" />}
        </span>
        <span>{t('ai.ask')}</span>
        {(safety || (proactive && !open)) && <span className={`h-2 w-2 rounded-full ${safety ? 'bg-red-200' : 'bg-amber-200'} pulse-dot`} />}
      </button>

      {/* Proactive bubble (only when panel closed) */}
      {!open && proactive && (
        <div className="ai-pop fixed bottom-[150px] right-3 z-[54] max-w-[240px] rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-200 sm:bottom-[100px] sm:right-6">
          <div className={`text-[11px] font-extrabold uppercase tracking-wider ${proactive.intent === 'explain_warning' ? 'text-red-600' : 'text-brand-600'}`}>
            {proactive.intent === 'explain_warning' ? 'MAUSAM AI · ' + t('data.live') : t('ai.title')}
          </div>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-snug text-slate-800">{proactive.text}</p>
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => {
                openPanel();
                if (proactive.intent) ask(proactive.intent);
              }}
className="btn-primary !px-3 !py-1 !text-xs"
    >
      {t('ai.open')}
            </button>
            <button onClick={() => setProactive(null)} className="rounded-md p-1 text-slate-400 hover:text-slate-600" aria-label={t('btn.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Panel */}
      {open && (
        <div className="ai-pop fixed bottom-[150px] right-3 z-[55] flex max-h-[72vh] w-[calc(100vw-24px)] max-w-sm flex-col overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-200 sm:bottom-[100px] sm:right-6">
          {/* Header */}
          <div className={`relative px-4 pb-3 pt-4 text-white ${safety ? 'bg-red-600' : 'bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500'}`}>
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full ${safety ? 'bg-red-500/80' : 'bg-white/15'}`}>
                  {safety ? <ShieldAlert className="h-5 w-5" /> : <CloudSun className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-sm font-extrabold leading-tight">{t('ai.title')}</p>
                  <p className="text-[10px] text-white/80">{t('ai.subtitle')}</p>
                </div>
              </div>
              <button onClick={closePanel} className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15" aria-label={t('btn.close')}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold">
              <span className="inline-flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${sourceIsLive ? 'bg-emerald-300 pulse-dot' : 'bg-amber-200'}`} />
                {sourceLabel}
              </span>
              <span>· {t('ai.source')}</span>
              <span>· {p.emoji} {personaLabel}</span>
            </div>
            {safety && ctx.topWarning && (
              <div className="mt-2 rounded-xl bg-white/15 px-3 py-2">
                <p className="text-[11px] font-bold">{t('ai.warnLead')}</p>
                <p className="text-[10px] text-white/85">{ctx.topWarning.event} · {ctx.topWarning.severity.toUpperCase()}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button onClick={() => ask('explain_warning')} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-red-600">
                    {t('ai.explainWarning')}
                  </button>
                  <button onClick={() => nav('/alerts')} className="rounded-full bg-red-700/70 px-2.5 py-1 text-[11px] font-bold text-white">
                    {t('ai.viewAlert')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
            {messages.length === 0 && (
              <div className="text-center text-xs text-slate-400">
                {t('ai.helpPitch')}
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className="max-w-[85%]">
                  <div
                    className={`whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-brand-600 text-white'
                        : m.voice
                        ? 'rounded-bl-md bg-slate-100 italic text-slate-500'
                        : m.warning
                        ? 'rounded-bl-md bg-red-50 text-red-800 ring-1 ring-red-100'
                        : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200/70'
                    }`}
                  >
                    {m.text}
                    {m.warning && m.basis?.length ? <span className="mt-1 block text-[10px] font-semibold text-red-500">🚨 {t('ai.mustRead')}</span> : null}
                  </div>
                  {m.role === 'ai' && m.basis && m.basis.length > 0 && (
                    <div className="mt-1">
                      <button
                        onClick={() => setExpandedWhy((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                        className="text-[10px] font-bold text-slate-400 underline-offset-2 hover:text-brand-600"
                      >
                        {t('ai.why')} {expandedWhy[m.id] ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />}
                      </button>
                      {expandedWhy[m.id] && (
                        <ul className="mt-1 space-y-0.5 rounded-xl bg-white p-2 ring-1 ring-slate-200/70">
                          {m.basis.map((b, i) => (
                            <li key={i} className="flex items-center gap-1 text-[11px] text-slate-600">
                              <span className="text-emerald-500">✓</span> {t(b)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick questions */}
          <div className="flex flex-wrap gap-1.5 border-t border-slate-100 bg-white px-3 pt-2">
            {(QUICK_QUESTIONS[persona] ?? QUICK_QUESTIONS.general).map((q) => (
              <button key={q} onClick={() => ask(q)} className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100 transition-colors hover:bg-brand-100">
                {t(INTENT_LABEL_KEY[q])}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-2.5">
            <button onClick={onVoice} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600" title={t('ai.voice')}>
              <Mic className="h-[18px] w-[18px]" />
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
              placeholder={t('ai.placeholder')}
              className="field !rounded-full !py-2 text-[13px]"
            />
            <button onClick={handleSend} className="rounded-full bg-brand-600 p-2 text-white transition-colors hover:bg-brand-700" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
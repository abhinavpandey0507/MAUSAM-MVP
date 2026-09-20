import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Send, X, ChevronDown, ChevronUp, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { makeT } from '../i18n/translations';
import { useAsyncData } from '../hooks/useAsyncData';
import { api } from '../services/api';
import { getLocationDef } from '../data/locations';
import { getPersona } from '../data/personas';
import { greeting } from '../utils/format';
import type { WeatherEnvelope } from '../types';
import { buildMausamAiContext, answerIntent, QUICK_QUESTIONS, intentFromText, INTENT_LABEL_KEY, type AiIntent, type MausamAiContext } from '../ai/mausamAi';
import { createRecognizer, speakText, stopSpeaking, speechInputSupported, speechOutputSupported } from '../services/voice';
import { computeEnvironment, type EnvironmentTheme } from '../weather/environmentEngine';

type RobotState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'alert';

interface Message {
  id: number;
  role: 'ai' | 'user';
  text: string;
  intent?: AiIntent;
  basis?: string[];
  voice?: boolean;
  warning?: boolean;
}

const GLOW: Record<EnvironmentTheme, string> = {
  clear: '#22d3ee',
  partly: '#7dd3fc',
  cloudy: '#7dd3fc',
  overcast: '#93c5fd',
  rain: '#38bdf8',
  storm: '#f59e0b',
  fog: '#94a3b8',
  haze: '#d97706'
};

let msgSeq = 1;

/** CSS-only MAUSAM AI robot. States: idle / listening / thinking / speaking / alert. */
function RobotAvatar({ state, size = 'md', glow }: { state: RobotState; size?: 'sm' | 'md'; glow: string }) {
  return (
    <div
      className={`mausam-robot ${size === 'sm' ? 'robot-sm' : 'robot-md'}`}
      data-state={state}
      role="img"
      aria-label="MAUSAM AI"
      style={{ ['--robot-glow' as string]: glow } as React.CSSProperties}
    >
      <div className="robot-antenna">
        <span />
      </div>
      <div className="robot-head">
        <span className="robot-eye robot-eye-left" />
        <span className="robot-eye robot-eye-right" />
        <span className="robot-mouth" />
      </div>
      <div className="robot-body">
        <span className="robot-bodylight" />
      </div>
    </div>
  );
}

export function MausamAi() {
  const { persona, location, language, demoMode, severeSim, profile, voiceEnabled, voiceAutoSpeak, updateProfile } = useApp();
  const t = makeT(language);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [proactive, setProactive] = useState<{ text: string; intent: AiIntent } | null>(null);
  const [expandedWhy, setExpandedWhy] = useState<Record<number, boolean>>({});
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);

  const locDef = getLocationDef(location);
  const p = getPersona(persona);
  const baseName = profile.name?.trim() || p.label;
  const personaLabel = getPersona(persona).label;

  const fillL = useCallback(
    (key: string, vars?: Record<string, string>): string => {
      const s = t(key);
      return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`) : s;
    },
    [t]
  );

  const fetcher = useCallback(() => api.weather(location, demoMode), [location, demoMode]);
  const { data: weather } = useAsyncData<WeatherEnvelope>(fetcher, [location, demoMode]);

  const gk = greeting();
  const greetWord = t(`hero.${gk}`);

  const ctx: MausamAiContext = useMemo(
    () =>
      buildMausamAiContext({
        weather,
        language,
        name: profile.name.trim(),
        persona,
        personas: profile.personas,
        requirements: profile.requirements,
        locationId: location,
        locationLabel: locDef ? locDef.name : location,
        demoMode,
        severeSim
      }),
    [weather, language, profile.name, persona, profile.personas, profile.requirements, location, locDef, demoMode, severeSim]
  );

  /** Weather-reactive mood for the robot glow (same engine as the backdrop). */
  const mood = useMemo<EnvironmentTheme>(() => {
    const c = weather?.current ?? null;
    return computeEnvironment({
      condition: c?.weatherCondition ?? weather?.forecast?.[0]?.condition ?? null,
      rainProb: weather?.forecast?.[0]?.rainProb ?? null,
      rainfall: weather?.forecast?.[0]?.rainfall ?? c?.rainfall ?? null,
      visibility: c?.visibility ?? null,
      humidity: c?.humidity ?? null,
      windSpeed: c?.windSpeed ?? null,
      windDirection: c?.windDirection ?? null,
      warningSeverity: ctx.topWarning?.severity ?? null
    }).theme;
  }, [weather, ctx.topWarning]);

  const safety = ctx.safetyActive && !!ctx.topWarning;
  const robotState: RobotState = listening ? 'listening' : speaking ? 'speaking' : thinking ? 'thinking' : safety ? 'alert' : 'idle';
  const robotGlow = safety && robotState === 'alert' ? '#e11d48' : GLOW[mood];

  const push = useCallback((m: Omit<Message, 'id'>) => {
    setMessages((prev) => [...prev.slice(-19), { ...m, id: msgSeq++ }]);
  }, []);

  const afterAiReply = useCallback(
    (text: string) => {
      if (voiceEnabled && voiceAutoSpeak && speechOutputSupported()) {
        setSpeaking(true);
        speakText(text, language, { rate: 0.98, onEnd: () => setSpeaking(false) });
      }
    },
    [voiceEnabled, voiceAutoSpeak, language]
  );

  const respond = useCallback(
    (intent: AiIntent, userText: string) => {
      const ans = answerIntent(intent, ctx, t);
      push({ role: 'user', text: userText, intent });
      setThinking(true);
      window.setTimeout(() => {
        push({ role: 'ai', text: ans.text, intent: ans.intent, basis: ans.basis, warning: ans.intent === 'explain_warning' });
        setThinking(false);
        afterAiReply(ans.text);
      }, 420);
    },
    [ctx, push, t, afterAiReply]
  );

  const ask = useCallback(
    (intent: AiIntent) => respond(intent, t(INTENT_LABEL_KEY[intent])),
    [respond, t]
  );

  const submit = useCallback(
    (rawText: string) => {
      const raw = rawText.trim();
      if (!raw) return;
      respond(intentFromText(raw), raw);
      setInput('');
    },
    [respond]
  );

  const handleSend = useCallback(() => {
    submit(input);
  }, [input, submit]);

  // Greeting on open (and re-greet when persona changes while open).
  const lastPersona = useRef(persona);
  const messagesEmpty = messages.length === 0;
  useEffect(() => {
    if (!open) return;
    if (messagesEmpty || lastPersona.current !== persona) {
      lastPersona.current = persona;
      setThinking(true);
      const timer = window.setTimeout(() => {
        const ans = answerIntent('greeting', ctx, t);
        push({ role: 'ai', text: `${greetWord}, ${profile.name?.trim() || 'there'} ☀️\n\n${ans.text}`, intent: 'greeting', basis: ans.basis });
        setThinking(false);
        afterAiReply(ans.text);
      }, 420);
      return () => window.clearTimeout(timer);
    }
  }, [open, messagesEmpty, persona, ctx, push, greetWord, profile.name, t, afterAiReply]);

  // Proactive insight: max 1 at a time, calm, dismissible.
  const proactiveRef = useRef<{ shownAt: number; last: string } | null>(null);
  useEffect(() => {
    if (open) return;
    const now = Date.now();
    const last = proactiveRef.current;
    if (last && now - last.shownAt < 45000 && last.last === (safety ? 'warn' : 'ok')) return;
    const timer = setTimeout(() => {
      let text: string;
      let intent: AiIntent = 'best_time';
      if (safety) {
        text = fillL('ai.proactive.warning');
        intent = 'explain_warning';
      } else if (ctx.tomorrow && ctx.today && (ctx.tomorrow.rainProb ?? 0) > (ctx.today.rainProb ?? 0) + 15) {
        text = fillL('ai.proactive.rainUp', { name: baseName, day: ctx.tomorrow.weekday });
        intent = 'best_time';
      } else {
        text = fillL('ai.proactive.window', { name: baseName });
        intent = 'best_time';
      }
      setProactive({ text, intent });
      proactiveRef.current = { shownAt: Date.now(), last: safety ? 'warn' : 'ok' };
      setTimeout(() => setProactive(null), 8000);
    }, 6000);
    return () => clearTimeout(timer);
  }, [open, safety, ctx, fillL, baseName]);

  useEffect(() => {
    if (!safety) return;
    setProactive({ text: fillL('ai.proactive.warning'), intent: 'explain_warning' });
  }, [safety, fillL]);

  const openPanel = useCallback(() => {
    setOpen(true);
    setProactive(null);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setProactive(null);
    setIntroDismissed(false);
  }, []);

  // Voice input (Web Speech API) with graceful fallback.
  const voiceInputOk = useMemo(() => speechInputSupported(), []);
  const recRef = useRef<ReturnType<typeof createRecognizer> | null>(null);
  const stopListeningCleanly = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => stopListeningCleanly, [stopListeningCleanly]);

  const toggleVoice = useCallback(() => {
    if (!voiceEnabled) {
      push({ role: 'ai', text: t('ai.voiceOff'), voice: true });
      return;
    }
    if (listening) {
      stopListeningCleanly();
      return;
    }
    if (!voiceInputOk) {
      push({ role: 'ai', text: t('ai.listen.unsupported'), voice: true });
      return;
    }
    const rec = createRecognizer({
      lang: language,
      onResult: (transcript, isFinal) => {
        const txt = transcript.trim();
        if (isFinal && txt) {
          stopListeningCleanly();
          submit(txt);
        } else {
          setInput(txt);
        }
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false)
    });
    if (!rec) {
      push({ role: 'ai', text: t('ai.listen.unsupported'), voice: true });
      return;
    }
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [voiceEnabled, listening, voiceInputOk, language, push, t, stopListeningCleanly, submit]);

  // Read the latest AI reply aloud / stop.
  const lastAiRef = useRef<string | null>(null);
  const lastAi = [...messages].reverse().find((m) => m.role === 'ai');
  lastAiRef.current = lastAi?.text ?? null;

  const speakLast = useCallback(() => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const text = lastAiRef.current;
    if (!text) return;
    if (!speechOutputSupported()) {
      push({ role: 'ai', text: t('ai.listen.unsupported'), voice: true });
      return;
    }
    setSpeaking(true);
    speakText(text, language, { rate: 0.98, onEnd: () => setSpeaking(false) });
  }, [speaking, language, push, t]);

  const sourceLabel = ctx.dataMode === 'fallback' || ctx.dataMode === 'demo' ? t('ai.statusFallback') : t('ai.statusOk');
  const sourceIsLive = ctx.dataMode !== 'fallback' && ctx.dataMode !== 'demo';
  const statusLabel = listening ? t('ai.listen.hint') : speaking ? t('ai.speaking') : thinking ? t('ai.think') : sourceLabel;
  const introVisible = open && !profile.assistantIntroSeen && !introDismissed;

  return (
    <>
      {/* Floating robot button */}
      <button
        onClick={openPanel}
        className={`fixed bottom-[90px] right-3 z-[55] flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-bold shadow-card transition-all hover:scale-[1.03] sm:right-6 ${
          safety ? 'ai-ring bg-red-600 text-white' : 'bg-gradient-to-br from-brand-600 to-cyan-500 text-white'
        }`}
        aria-label={t('ai.ask')}
      >
        <span className={`flex h-12 w-14 items-center justify-center rounded-full ${safety ? 'bg-red-500/80' : 'bg-white/15'}`}>
          <RobotAvatar state={robotState} size="sm" glow={robotGlow} />
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
          {/* Header with robot */}
          <div className={`relative px-4 pb-3 pt-4 text-white ${safety ? 'bg-red-600' : 'bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500'}`}>
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-14 shrink-0 items-center justify-center">
                <RobotAvatar state={robotState} size="md" glow={robotGlow} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold leading-tight">{t('ai.title')}</p>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      listening || speaking ? 'bg-cyan-200 pulse-dot' : sourceIsLive ? 'bg-emerald-300 pulse-dot' : 'bg-amber-200'
                    }`}
                  />
                  {statusLabel}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-white/75">
                  <span>{t('ai.source')}</span>
                  <span>·</span>
                  <span>
                    {p.emoji} {personaLabel}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={speakLast}
                  title={speaking ? t('ai.stop') : t('ai.speak')}
                  aria-label={speaking ? t('ai.stop') : t('ai.speak')}
                  className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15"
                >
                  {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button onClick={closePanel} className="rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15" aria-label={t('btn.close')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {safety && ctx.topWarning && (
              <div className="mt-2 rounded-xl bg-white/15 px-3 py-2">
                <p className="text-[11px] font-bold">{t('ai.warnLead')}</p>
                <p className="text-[10px] text-white/85">
                  {ctx.topWarning.event} · {ctx.topWarning.severity.toUpperCase()}
                </p>
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
            {introVisible && (
              <div className="ai-pop rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-100">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-xl" aria-hidden>
                    🤖
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-brand-800">{t('ai.intro.title')}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{fillL('ai.intro.body', { name: baseName })}</p>
                    {safety && <p className="mt-1.5 text-[11px] font-bold text-red-600">🚨 {t('ai.intro.safety')}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      updateProfile({ assistantIntroSeen: true });
                      setIntroDismissed(true);
                    }}
                    className="btn-primary !px-3 !py-1.5 !text-xs"
                  >
                    {t('ai.intro.gotIt')}
                  </button>
                  <button onClick={() => setIntroDismissed(true)} className="btn-secondary !px-3 !py-1.5 !text-xs">
                    {t('ai.intro.later')}
                  </button>
                </div>
              </div>
            )}
            {messages.length === 0 && !introVisible && <div className="text-center text-xs text-slate-400">{t('ai.helpPitch')}</div>}
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
            <button
              onClick={toggleVoice}
              title={listening ? t('ai.micStop') : voiceEnabled && voiceInputOk ? t('ai.micStart') : t('ai.listen.unsupported')}
              aria-label={listening ? t('ai.micStop') : t('ai.micStart')}
              className={`rounded-full p-2 transition-colors hover:bg-slate-100 ${listening ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-brand-600'}`}
            >
              {listening ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
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
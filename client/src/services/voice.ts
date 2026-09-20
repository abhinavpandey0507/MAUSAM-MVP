/**
 * VOICE SERVICE
 * -------------
 * Thin wrappers over the Web Speech API with Indian locale support:
 *   en -> en-IN, hi -> hi-IN, pa -> pa-IN
 * Everything degrades gracefully (and reports support) when the browser does
 * not expose SpeechRecognition / SpeechSynthesis.
 */

import type { Language } from '../types';

export const SPEECH_LOCALE: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  pa: 'pa-IN'
};

export type RecognizerStatus = 'idle' | 'listening';

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; length: number; [index: number]: { transcript: string } };
  };
}

type RecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionCtor(): RecognitionConstructor | null {
  const w = window as unknown as { webkitSpeechRecognition?: RecognitionConstructor; SpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechInputSupported(): boolean {
  return typeof window !== 'undefined' && !!recognitionCtor();
}

export function speechOutputSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface VoiceRecognizer {
  start: () => void;
  stop: () => void;
  readonly status: RecognizerStatus;
}

export function createRecognizer(opts: {
  lang: Language;
  onResult: (transcript: string, isFinal: boolean) => void;
  onEnd: () => void;
  onError: (err: string) => void;
}): VoiceRecognizer | null {
  const Ctor = recognitionCtor();
  const synth = speechOutputSupported();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = SPEECH_LOCALE[opts.lang];
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  let status: RecognizerStatus = 'idle';

  rec.onstart = () => {
    status = 'listening';
  };
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      const res = e.results[i];
      if (!res || res.length === 0) continue;
      const transcript = res[0]?.transcript ?? '';
      if (transcript) opts.onResult(transcript, res.isFinal);
    }
  };
  rec.onerror = (e) => {
    opts.onError(e.error);
  };
  rec.onend = () => {
    status = 'idle';
    opts.onEnd();
  };

  return {
    get status() {
      return status;
    },
    start: () => {
      try {
        status = 'listening';
        rec.start();
      } catch {
        status = 'idle';
        opts.onError('start-failed');
      }
    },
    stop: () => {
      try {
        rec.stop();
      } catch {
        status = 'idle';
        opts.onEnd();
      }
    }
  };
}

/** Text-to-speech that favours the matching Indian locale voice. */
export function speakText(text: string, lang: Language, opts: { rate?: number; pitch?: number; onEnd?: () => void } = {}): boolean {
  const synth = window.speechSynthesis;
  if (!synth) return false;
  // Lip/talk action is nice on a robot; wait for the pending voices if needed.
  if (synth.speaking) synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = SPEECH_LOCALE[lang];
  utter.rate = opts.rate ?? 1;
  utter.pitch = opts.pitch ?? 1.02;
  if (opts.onEnd) utter.onend = () => opts.onEnd?.();

  const localePrefix = SPEECH_LOCALE[lang].toLowerCase();
  const voices = synth.getVoices();
  const match =
    voices.find((v) => v.lang.toLowerCase() === localePrefix && /female|google/i.test(v.name)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(localePrefix.slice(0, 2))) ??
    voices.find((v) => v.lang.toLowerCase() === localePrefix) ??
    null;
  if (match) utter.voice = match;
  synth.speak(utter);
  return true;
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export const isSpeaking = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking;
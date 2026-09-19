import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppState, Language, PersonaId, Profile, Warning } from '../types';

const STORAGE_KEY = 'mausam.sih26076.state.v1';

const DEFAULT_PROFILE: Profile = {
  name: '',
  phone: '',
  email: '',
  persona: 'general',
  personas: ['general'],
  requirements: ['temperature', 'rain', 'forecast', 'severe_weather'],
  language: 'en',
  activity: '',
  notify: { alerts: true, daily: true, insights: true },
  onboarded: false
};

const DEFAULT_STATE: AppState = {
  persona: 'general',
  location: 'new-delhi',
  language: 'en',
  demoMode: false,
  severeSim: false,
  profile: DEFAULT_PROFILE
};

interface AppContextValue extends AppState {
  setPersona: (p: PersonaId) => void;
  setLocation: (l: string) => void;
  setLanguage: (l: Language) => void;
  setDemoMode: (v: boolean) => void;
  setSevereSim: (v: boolean) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  addPersona: (p: PersonaId) => void;
  removePersona: (p: PersonaId) => void;
  setPersonas: (list: PersonaId[]) => void;
  toggleRequirement: (r: string) => void;
  setRequirements: (list: string[]) => void;
  completeOnboarding: (p: {
    name: string;
    phone: string;
    email: string;
    persona: PersonaId;
    personas: PersonaId[];
    requirements: string[];
    location: string;
    notify?: Partial<Profile['notify']>;
  }) => void;
  resetProfile: () => void;
  savedLocations: string[];
  addSavedLocation: (id: string) => void;
  removeSavedLocation: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadInitial(): AppState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      profile: { ...DEFAULT_PROFILE, ...(parsed.profile || {}) }
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadInitial);
  const [savedLocations, setSavedLocations] = useState<string[]>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('mausam.savedLocations') || '["new-delhi"]');
    } catch {
      return ['new-delhi'];
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable */
    }
  }, [state]);

  useEffect(() => {
    try {
      window.localStorage.setItem('mausam.savedLocations', JSON.stringify(savedLocations));
    } catch {
      /* noop */
    }
  }, [savedLocations]);

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      setPersona: (persona) => setState((s) => ({ ...s, persona, profile: { ...s.profile, persona } })),
      setLocation: (location) => setState((s) => ({ ...s, location })),
      setLanguage: (language) => setState((s) => ({ ...s, language, profile: { ...s.profile, language } })),
      setDemoMode: (demoMode) => setState((s) => ({ ...s, demoMode })),
      setSevereSim: (severeSim) => setState((s) => ({ ...s, severeSim })),
      updateProfile: (patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
      addPersona: (p) =>
        setState((s) => {
          const personas = s.profile.personas.includes(p) ? s.profile.personas : [...s.profile.personas, p];
          return { ...s, profile: { ...s.profile, personas } };
        }),
      removePersona: (p) =>
        setState((s) => ({
          ...s,
          profile: { ...s.profile, personas: s.profile.personas.filter((x) => x !== p).length ? s.profile.personas.filter((x) => x !== p) : s.profile.personas }
        })),
      setPersonas: (list) =>
        setState((s) => {
          const personas = list.length ? list : s.profile.personas;
          return {
            ...s,
            persona: personas.includes(s.persona) ? s.persona : personas[0],
            profile: { ...s.profile, personas, persona: personas.includes(s.profile.persona) ? s.profile.persona : personas[0] }
          };
        }),
      toggleRequirement: (r) =>
        setState((s) => {
          const requirements = s.profile.requirements.includes(r) ? s.profile.requirements.filter((x) => x !== r) : [...s.profile.requirements, r];
          return { ...s, profile: { ...s.profile, requirements } };
        }),
      setRequirements: (list) => setState((s) => ({ ...s, profile: { ...s.profile, requirements: list } })),
      completeOnboarding: ({ name, phone, email, persona, personas, requirements, location, notify }) =>
        setState((s) => ({
          ...s,
          persona,
          location,
          profile: { ...s.profile, name, phone, email, persona, personas, requirements, language: s.language, activity: '', onboarded: true, notify: { ...s.profile.notify, ...(notify || {}) } }
        })),
      resetProfile: () => setState((s) => ({ ...s, persona: DEFAULT_PROFILE.persona, profile: { ...DEFAULT_PROFILE } })),
      savedLocations,
      addSavedLocation: (id) => setSavedLocations((prev) => (prev.includes(id) ? prev : [...prev, id])),
      removeSavedLocation: (id) => setSavedLocations((prev) => prev.filter((x) => x !== id))
    }),
    [state, savedLocations]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/** Builds the effective warning list: real warnings + optional demo severe override. */
export function effectiveWarnings(warnings: Warning[], demoMode: boolean, severeSim: boolean, area: string): Warning[] {
  const base = warnings?.map((w) => ({ ...w, source: w.source === 'simulated' && demoMode ? 'demo-simulation' : w.source })) ?? [];
  if (demoMode && severeSim) {
    const now = new Date();
    return [
      ...base,
      {
        severity: 'alert',
        event: 'Heavy rain with strong winds (DEMO scenario)',
        area: area || 'your area',
        detail: 'Simulated for demonstration. This is NOT an official IMD warning - it demonstrates the safety override rule of the personalization engine.',
        validFrom: now.toISOString(),
        validUntil: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(),
        source: 'demo-simulation'
      }
    ];
  }
  return base;
}
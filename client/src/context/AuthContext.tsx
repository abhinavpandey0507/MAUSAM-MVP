import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setAuthToken } from '../services/apiClient';
import { sqlApi } from '../services/sqlApi';
import { useApp } from './AppContext';
import type { AuthUser, UserPreferences } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  preferences: UserPreferences | null;
  loading: boolean;
  busy: boolean;
  error: string | null;
  isAuthenticated: boolean;
  register: (email: string, password: string, displayName?: string) => Promise<AuthUser>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<UserPreferences>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await sqlApi.auth.me();
      setUser(res.user);
      setPreferences(res.preferences);
    } catch {
      // 401 = simply not signed in (or no backend); keep the app usable.
      setUser(null);
      setPreferences(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    sqlApi.auth
      .me()
      .then((res) => {
        if (!active) return;
        setUser(res.user);
        setPreferences(res.preferences);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // When an account is loaded/updated, apply its saved preferences to the app.
  const { setLanguage, setLocation } = useApp();
  const prefLang = preferences?.language;
  const prefLoc = preferences?.preferredLocation;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (preferences && prefLang) setLanguage(prefLang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefLang]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (preferences && prefLoc) setLocation(prefLoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefLoc]);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await sqlApi.auth.register(email, password, displayName);
      setUser(res.user);
      setPreferences((await sqlApi.user.getPreferences().catch(() => null)) ?? null);
      return res.user;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await sqlApi.auth.login(email, password);
      setUser(res.user);
      setPreferences((await sqlApi.user.getPreferences().catch(() => null)) ?? null);
      return res.user;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await sqlApi.auth.logout();
    } catch {
      /* ignore network errors on logout */
    } finally {
      setAuthToken(null);
      setUser(null);
      setPreferences(null);
      setBusy(false);
    }
  }, []);

  const updatePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const prefs = await sqlApi.user.updatePreferences(patch);
    setPreferences(prefs);
    return prefs;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      preferences,
      loading,
      busy,
      error,
      isAuthenticated: Boolean(user),
      register,
      login,
      logout,
      updatePreferences,
      refresh,
      clearError: () => setError(null)
    }),
    [user, preferences, loading, busy, error, register, login, logout, updatePreferences, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

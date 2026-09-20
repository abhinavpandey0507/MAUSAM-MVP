import { useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { AppFooter } from './components/AppFooter';
import { MausamAi } from './components/MausamAi';
import { WeatherEnvironment } from './components/WeatherEnvironment';
import { useApp } from './context/AppContext';
import { useAsyncData } from './hooks/useAsyncData';
import { api } from './services/api';
import type { WeatherEnvelope } from './types';
import { Onboarding } from './pages/Onboarding';

/** Immersive full-screen weather backdrop, driven by the same live data as the app. */
function WeatherBackdrop() {
  const { location, demoMode } = useApp();
  const fetcher = useCallback(() => api.weather(location, demoMode), [location, demoMode]);
  const { data: weather } = useAsyncData<WeatherEnvelope>(fetcher, [location, demoMode]);
  return <WeatherEnvironment weather={weather} />;
}

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
      <WeatherBackdrop />
      <TopBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <AppFooter />
      <BottomNav />
      <MausamAi />
    </div>
  );
}

export function Gate() {
  const { profile } = useApp();
  if (!profile.onboarded) return <Onboarding />;
  return <Layout />;
}
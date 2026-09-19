import { Outlet } from 'react-router-dom';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { AppFooter } from './components/AppFooter';
import { MausamAi } from './components/MausamAi';
import { useApp } from './context/AppContext';
import { Onboarding } from './pages/Onboarding';

export function Layout() {
  return (
    <div className="flex min-h-full flex-col">
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
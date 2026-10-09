import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { CloudSun, Mail, Lock, UserRound, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

type Mode = 'login' | 'register';

export function Auth() {
  const { login, register, busy, error, clearError, isAuthenticated } = useAuth();
  const { demoMode } = useApp();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (isAuthenticated) {
    return (
      <div className="mx-auto max-w-md px-4 pb-28 pt-10 text-center">
        <ShieldCheck className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-3 text-xl font-extrabold text-slate-900">You are signed in</h1>
        <p className="mt-1 text-sm text-slate-500">Your session is stored in a secure httpOnly cookie.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link to="/" className="btn-primary">Go to dashboard</Link>
          <Link to="/profile" className="btn-secondary">Profile</Link>
        </div>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();
    try {
      if (mode === 'register') {
        await register(email.trim(), password, displayName.trim() || undefined);
      } else {
        await login(email.trim(), password);
      }
      nav(from, { replace: true });
    } catch {
      /* error surfaced via context */
    }
  };

  const shownError = localError || error;

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-8">
      <div className="mb-5 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-900 shadow-sm">
          <CloudSun className="h-8 w-8 text-white" />
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
          {mode === 'login' ? 'Sign in to MAUSAM' : 'Create your MAUSAM account'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {mode === 'login'
            ? 'Access saved locations, personalized interests and preferences.'
            : 'Register to personalize your dashboard and sync preferences.'}
        </p>
        {demoMode && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
            Demo mode · weather shown is simulated
          </p>
        )}
      </div>

      <form onSubmit={submit} className="card space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setLocalError(null);
                clearError();
              }}
              className={`rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                mode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {mode === 'register' && (
          <div>
            <label className="label-caps">Display name</label>
            <div className="relative mt-1.5">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="field !pl-9"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          </div>
        )}

        <div>
          <label className="label-caps">Email</label>
          <div className="relative mt-1.5">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field !pl-9"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div>
          <label className="label-caps">Password</label>
          <div className="relative mt-1.5">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field !pl-9"
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
          </div>
        </div>

        {shownError && (
          <p className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {shownError}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <p className="text-center text-[11px] text-slate-400">
          Sessions use a signed httpOnly cookie. Passwords are stored only as PBKDF2-SHA256 hashes.
        </p>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link to="/" className="font-semibold text-brand-700 hover:underline">
          Continue browsing without an account
        </Link>
      </p>
    </div>
  );
}

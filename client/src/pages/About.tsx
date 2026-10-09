import { Info, ShieldCheck, Database, Server, Heart, Users, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';

const STACK = [
  { label: 'Frontend', value: 'React 18 · Vite · TypeScript · Tailwind CSS · Recharts' },
  { label: 'Backend', value: 'Python · FastAPI · Uvicorn' },
  { label: 'Database', value: 'SQLite (local dataset) via the standard library' },
  { label: 'Auth', value: 'PBKDF2-SHA256 passwords · HS256 JWT in an httpOnly cookie' },
  { label: 'External APIs', value: 'None required — the app runs fully offline on the local dataset' }
];

export function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">About</p>
      <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
        <Info className="h-6 w-6 text-brand-600" /> About MAUSAM
      </h1>

      <section className="card mt-4 space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Cpu className="h-4 w-4 text-brand-500" /> Personalized Weather Intelligence
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          MAUSAM turns raw weather observations into a personalized briefing: the same data is ranked and explained
          differently for a farmer, an airline dispatcher, a runner or an event planner. Severe-weather safety signals
          always take priority over personalization.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          Built for <b>Smart India Hackathon 2026</b> (problem <b>SIH26076</b>) by team <b>THE_UNSCRIPTED</b>.
        </p>
      </section>

      <section className="card mt-4 space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Database className="h-4 w-4 text-brand-500" /> Data &amp; provenance policy
        </h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <Server className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            All weather data is read from a local SQL dataset — <b>no third-party weather, AQI or geocoding API</b> is called at runtime.
          </li>
          <li className="flex gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Simulated rows are always labelled (<code className="rounded bg-slate-100 px-1">is_demo</code>) and the UI shows
            a <b>SIMULATED DATA</b> badge. Simulated values are never presented as a live official feed.
          </li>
          <li className="flex gap-2">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            Coverage, row counts and the last ingest time are visible on the{' '}
            <Link to="/dataset" className="font-semibold text-brand-700 hover:underline">Dataset</Link> page.
          </li>
        </ul>
      </section>

      <section className="card mt-4 space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <ShieldCheck className="h-4 w-4 text-emerald-500" /> Account &amp; privacy
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          Accounts are optional. When you sign in, the session is carried in a signed <b>httpOnly</b> cookie (never in
          localStorage) and passwords are stored only as salted PBKDF2-SHA256 hashes. Your saved locations, interests and
          preferences are stored in the local database and can be deleted at any time from{' '}
          <Link to="/settings" className="font-semibold text-brand-700 hover:underline">Settings</Link>.
        </p>
      </section>

      <section className="card mt-4 space-y-2 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Users className="h-4 w-4 text-brand-500" /> Technology
        </h2>
        <dl className="mt-1 divide-y divide-slate-100">
          {STACK.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{s.label}</dt>
              <dd className="text-sm font-medium text-slate-700 sm:text-right">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        Made with <Heart className="h-3.5 w-3.5 text-red-400" /> for SIH 2026 · SIH26076 · THE_UNSCRIPTED
      </p>
    </div>
  );
}

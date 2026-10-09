import { useMemo, useState } from 'react';
import { CalendarRange, Thermometer, Droplets, CloudRain, Loader2, LineChart as LineChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useApp } from '../context/AppContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { sqlApi } from '../services/sqlApi';
import { getLocationDef } from '../data/locations';
import { fmtTemp, fmtPercent, fmtNum } from '../utils/format';
import type { ObservationPoint } from '../types';

const RANGES = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: 'all', label: 'All', days: 0 }
] as const;

export function History() {
  const { location, demoMode } = useApp();
  const locDef = getLocationDef(location);
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('7');

  const { data, loading, error, refetch } = useAsyncData(() => sqlApi.weatherHistory(location), [location]);

  const rows = data?.data ?? [];
  const isDemo = data?.meta?.isDemo ?? rows.some((r) => r.isDemo);

  const filtered = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days ?? 0;
    const sorted = [...rows].sort((a, b) => a.time.localeCompare(b.time));
    if (!days) return sorted;
    return sorted.slice(-days);
  }, [rows, range]);

  const chartData = useMemo(
    () =>
      filtered.map((r) => ({
        ...r,
        label: r.time.slice(5, 10)
      })),
    [filtered]
  );

  const stats = useMemo(() => {
    if (!filtered.length) return null;
    const temps = filtered.map((r) => r.temperature).filter((n) => Number.isFinite(n));
    const rain = filtered.reduce((acc, r) => acc + (r.rainfall || 0), 0);
    const hum = filtered.map((r) => r.humidity).filter((n) => Number.isFinite(n));
    return {
      max: Math.max(...temps),
      min: Math.min(...temps),
      avg: temps.reduce((a, b) => a + b, 0) / (temps.length || 1),
      rain,
      humidity: hum.reduce((a, b) => a + b, 0) / (hum.length || 1)
    };
  }, [filtered]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Historical Weather</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <CalendarRange className="h-6 w-6 text-brand-600" /> Past observations
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {locDef.name}, {locDef.state} · stored in the local SQL dataset
          </p>
        </div>
        <span className={`chip ${isDemo || demoMode ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isDemo || demoMode ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          {isDemo || demoMode ? 'SIMULATED DATA' : 'LIVE DATA'}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`chip ${range === r.id ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-10 flex items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
          {error}
          <button onClick={refetch} className="ml-2 underline">Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No historical observations are stored for this range yet.
        </div>
      )}

      {stats && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4">
            <p className="label-caps flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-red-500" /> Max</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{fmtTemp(stats.max)}</p>
          </div>
          <div className="card p-4">
            <p className="label-caps flex items-center gap-1"><Thermometer className="h-3.5 w-3.5 text-sky-500" /> Min</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{fmtTemp(stats.min)}</p>
          </div>
          <div className="card p-4">
            <p className="label-caps flex items-center gap-1"><CloudRain className="h-3.5 w-3.5 text-brand-500" /> Rainfall Σ</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{fmtNum(stats.rain, 1)} mm</p>
          </div>
          <div className="card p-4">
            <p className="label-caps flex items-center gap-1"><Droplets className="h-3.5 w-3.5 text-cyan-500" /> Avg humidity</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{fmtPercent(stats.humidity)}</p>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <>
          <section className="card mt-4 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <LineChartIcon className="h-4 w-4 text-brand-500" /> Temperature &amp; rainfall
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" minTickGap={24} />
                  <YAxis yAxisId="temp" tick={{ fontSize: 11 }} stroke="#94a3b8" unit="°" />
                  <YAxis yAxisId="rain" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" unit="mm" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area yAxisId="rain" type="monotone" dataKey="rainfall" name="Rainfall (mm)" fill="#bae6fd" stroke="#0ea5e9" fillOpacity={0.5} />
                  <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temperature (°C)" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line yAxisId="temp" type="monotone" dataKey="feelsLike" name="Feels like (°C)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="card mt-4 overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">Recent observations</h2>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Time</th>
                    <th className="px-4 py-2 font-semibold">Temp</th>
                    <th className="px-4 py-2 font-semibold">Humidity</th>
                    <th className="px-4 py-2 font-semibold">Wind</th>
                    <th className="px-4 py-2 font-semibold">Rain</th>
                    <th className="px-4 py-2 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].reverse().map((r: ObservationPoint) => (
                    <tr key={r.time} className="border-t border-slate-50">
                      <td className="px-4 py-2 text-slate-600">{new Date(r.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit' })}</td>
                      <td className="px-4 py-2 font-semibold text-slate-800">{fmtTemp(r.temperature)}</td>
                      <td className="px-4 py-2 text-slate-600">{fmtPercent(r.humidity)}</td>
                      <td className="px-4 py-2 text-slate-600">{fmtNum(r.windSpeed, 0)} km/h</td>
                      <td className="px-4 py-2 text-slate-600">{fmtNum(r.rainfall, 1)} mm</td>
                      <td className="px-4 py-2">
                        <span className={`chip ${r.isDemo ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
                          {r.isDemo ? 'Simulated' : 'IMD'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

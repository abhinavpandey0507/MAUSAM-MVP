import { useMemo } from 'react';
import { Wind, Loader2, Info } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useApp } from '../context/AppContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { sqlApi } from '../services/sqlApi';
import { getLocationDef } from '../data/locations';
import { fmtNum } from '../utils/format';
import type { AqiPoint } from '../types';

function aqiColor(aqi: number): { stroke: string; text: string; bg: string } {
  if (aqi <= 50) return { stroke: '#16a34a', text: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' };
  if (aqi <= 100) return { stroke: '#65a30d', text: 'text-lime-700', bg: 'bg-lime-50 ring-lime-200' };
  if (aqi <= 200) return { stroke: '#f59e0b', text: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' };
  if (aqi <= 300) return { stroke: '#ea580c', text: 'text-orange-700', bg: 'bg-orange-50 ring-orange-200' };
  if (aqi <= 400) return { stroke: '#dc2626', text: 'text-red-700', bg: 'bg-red-50 ring-red-200' };
  return { stroke: '#7f1d1d', text: 'text-red-900', bg: 'bg-red-100 ring-red-300' };
}

function Gauge({ aqi, category }: { aqi: number; category: string }) {
  const color = aqiColor(aqi);
  const pct = Math.min(100, Math.round((aqi / 500) * 100));
  return (
    <div className="flex items-center gap-5">
      <div
        className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color.stroke} ${pct}%, #e2e8f0 ${pct}% 100%)`
        }}
        role="img"
        aria-label={`AQI ${aqi}, ${category}`}
      >
        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
          <span className="text-3xl font-black leading-none text-slate-900">{aqi}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AQI</span>
        </div>
      </div>
      <div>
        <span className={`chip ${color.bg} ${color.text}`}>{category}</span>
        <p className="mt-2 text-sm text-slate-500">
          Air Quality Index on a 0–500 scale. Lower is better; values above 200 are unhealthy.
        </p>
      </div>
    </div>
  );
}

function Pollutant({ label, value, unit }: { label: string; value: number | undefined; unit: string }) {
  return (
    <div className="card p-3.5">
      <p className="label-caps">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-slate-900">
        {fmtNum(value, 1)} <span className="text-xs font-semibold text-slate-400">{unit}</span>
      </p>
    </div>
  );
}

export function AirQuality() {
  const { location, demoMode } = useApp();
  const locDef = getLocationDef(location);
  const { data, loading, error, refetch } = useAsyncData(() => sqlApi.weatherAqi(location), [location]);

  const latest = data?.data?.latest ?? null;
  const history: AqiPoint[] = data?.data?.history ?? [];
  const isDemo = data?.meta?.isDemo ?? latest?.isDemo ?? false;

  const chartData = useMemo(
    () => history.map((h) => ({ ...h, label: h.recordedAt.slice(5, 10) })),
    [history]
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5">
      <div className="fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Air Quality</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
            <Wind className="h-6 w-6 text-brand-600" /> Air Quality Index
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {locDef.name}, {locDef.state}
          </p>
        </div>
        <span className={`chip ${isDemo || demoMode ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${isDemo || demoMode ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          {isDemo || demoMode ? 'SIMULATED DATA' : 'LIVE DATA'}
        </span>
      </div>

      {/* Honest provenance note — the backend supplies this text. */}
      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        {data?.meta?.note ?? 'Air quality values are a labelled simulated dataset for demonstration.'}
      </p>

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

      {!loading && !latest && !error && (
        <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No air-quality records are stored for this location.
        </div>
      )}

      {latest && (
        <>
          <section className="card mt-4 p-5">
            <Gauge aqi={latest.aqi} category={latest.category} />
            <p className="mt-4 text-[11px] text-slate-400">
              Recorded {new Date(latest.recordedAt).toLocaleString('en-IN')} · source: {latest.source}
            </p>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Pollutant label="PM2.5" value={latest.pm25} unit="µg/m³" />
            <Pollutant label="PM10" value={latest.pm10} unit="µg/m³" />
            <Pollutant label="NO₂" value={latest.no2} unit="µg/m³" />
            <Pollutant label="SO₂" value={latest.so2} unit="µg/m³" />
          </div>
        </>
      )}

      {chartData.length > 0 && (
        <section className="card mt-4 p-4">
          <h2 className="mb-3 text-sm font-bold text-slate-900">AQI trend</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#94a3b8" minTickGap={24} />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Area type="monotone" dataKey="aqi" name="AQI" stroke="#4f46e5" strokeWidth={2} fill="url(#aqiFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import type { WeatherEnvelope, Severity } from '../types';
import { computeEnvironment, type EnvironmentVisual } from '../weather/environmentEngine';

/* Deterministic PRNG so the scene is stable across re-renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface CloudSpec {
  id: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  blur: number;
  duration: number;
  z: number;
}

interface RainSpec {
  id: number;
  left: number;
  top: number;
  height: number;
  duration: number;
  delay: number;
  angle: number;
}

const SEED = 26076;

function arrangeClouds(v: EnvironmentVisual, count: number, rand: () => number): CloudSpec[] {
  const out: CloudSpec[] = [];
  const speedBase = 22 / Math.max(0.15, v.cloudSpeed + 0.1);
  for (let i = 0; i < count; i += 1) {
    out.push({
      id: i,
      top: 2 + rand() * 60,
      width: 35 + rand() * 45,
      height: 9 + rand() * 12,
      opacity: 0.35 + rand() * 0.5,
      blur: 9 + rand() * 16,
      duration: speedBase * (0.6 + rand() * 1.6),
      z: Math.round(1 + rand() * 2)
    });
  }
  // Far clouds drift a bit slower so nearer (higher z) clouds feel faster.
  return out.sort((a, b) => a.z - b.z);
}

function arrangeRain(v: EnvironmentVisual, count: number, rand: () => number): RainSpec[] {
  const intense = v.rainIntensity;
  const out: RainSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    const speed = 0.5 + (1 - intense) * 0.3 + rand() * 0.5;
    out.push({
      id: i,
      left: rand() * 100,
      top: rand() * 110,
      height: 9 + rand() * 12,
      duration: speed,
      delay: -rand() * speed,
      angle: v.stormIntensity > 0.45 ? (rand() > 0.5 ? 18 : -8) : 0
    });
  }
  return out;
}

function arrangeStars(count: number, rand: () => number): { id: number; left: number; top: number; size: number; duration: number }[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: rand() * 100,
    top: rand() * 70,
    size: 1 + Math.round(rand() * 1.5),
    duration: 1.6 + rand() * 3
  }));
}

function topSeverity(warnings: WeatherEnvelope['warnings'] | undefined): Severity | null {
  if (!warnings?.length) return null;
  const rank = { no_warning: 0, watch: 1, alert: 2, warning: 3 } as const;
  return warnings.reduce<Severity>((acc, w) => (rank[w.severity] > rank[acc] ? w.severity : acc), 'no_warning');
}

export function WeatherEnvironment({ weather }: { weather: WeatherEnvelope | null }) {
  const reduced = useMemo(
    () => (typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false),
    []
  );
  const mobile = useMemo(
    () => (typeof window !== 'undefined' ? window.innerWidth < 640 : false),
    []
  );

  const v: EnvironmentVisual = useMemo(() => {
    const c = weather?.current ?? null;
    return computeEnvironment({
      condition: c?.weatherCondition ?? weather?.forecast?.[0]?.condition ?? null,
      rainProb: weather?.forecast?.[0]?.rainProb ?? null,
      rainfall: weather?.forecast?.[0]?.rainfall ?? c?.rainfall ?? null,
      visibility: c?.visibility ?? null,
      humidity: c?.humidity ?? null,
      windSpeed: c?.windSpeed ?? null,
      windDirection: c?.windDirection ?? null,
      warningSeverity: topSeverity(weather?.warnings)
    });
  }, [weather]);

  const rng = useMemo(() => mulberry32(SEED ^ v.theme.length * 7919 ^ v.stormIntensity * 1000), [v.theme, v.stormIntensity]);

  const clouds = useMemo(() => arrangeClouds(v, mobile ? 6 : 12, rng), [v, mobile, rng]);
  const rainDrops = useMemo(
    () => (v.rainIntensity > 0.02 && !reduced ? arrangeRain(v, mobile ? 24 : 46, rng) : []),
    [v, mobile, reduced, rng]
  );
  const stars = useMemo(
    () => (!v.isDay && !reduced ? arrangeStars(mobile ? 30 : 70, rng) : []),
    [v.isDay, mobile, reduced, rng]
  );

  const cloudTone = v.isDay ? 'rgba(255,255,255,0.92)' : 'rgba(148,163,184,0.5)';
  const clockwise = v.cloudDirection === 1;

  return (
    <div className="weather-env" data-theme={v.theme} data-day={v.isDay ? '1' : '0'} aria-hidden>
      <div className="we-sky" />
      <div className="we-horizon" />

      {v.sunVisible && <div className={`we-sun ${clockwise ? 'we-drift-right' : 'we-drift-left'}`} />}
      {!v.isDay && <div className="we-moon" />}
      {!v.isDay && (
        <div className="we-stars">
          {stars.map((s) => (
            <span
              key={s.id}
              className="we-star"
              style={{
                left: `${s.left}%`,
                top: `${s.top}%`,
                width: s.size,
                height: s.size,
                animationDuration: `${s.duration}s`,
                animationDelay: `${-s.duration * s.id * 0.37}s`
              }}
            />
          ))}
        </div>
      )}

      {clouds.map((cl) => (
        <div
          key={cl.id}
          className={`we-cloud ${clockwise ? 'we-drift-right' : 'we-drift-left'}`}
          style={{
            top: `${cl.top}%`,
            width: `${cl.width}vw`,
            height: `${cl.height}vh`,
            opacity: cl.opacity,
            filter: `blur(${cl.blur}px)`,
            animationDuration: `${cl.duration}s`,
            animationDelay: `${-cl.duration * cl.id * 0.31}s`,
            zIndex: cl.z,
            background: `radial-gradient(closest-side, ${cloudTone}, ${cloudTone}55 60%, transparent)`,
            boxShadow: `0 0 60px 10px ${cloudTone}22`
          }}
        />
      ))}

      {v.rainIntensity > 0.02 && v.fogIntensity < 0.5 && (
        <div className="we-rain" data-intense={v.rainIntensity > 0.55 ? '1' : '0'}>
          {rainDrops.map((d) => (
            <span
              key={d.id}
              className="we-drop"
              style={{
                left: `${d.left}%`,
                top: `${d.top}%`,
                height: `${d.height}px`,
                animationDuration: `${d.duration}s`,
                animationDelay: `${d.delay}s`,
                transform: d.angle ? `rotate(${d.angle}deg)` : undefined
              }}
            />
          ))}
        </div>
      )}

      {v.fogIntensity > 0.05 && (
        <div className="we-fog">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`we-fogbank ${i % 2 ? 'we-drift-left' : 'we-drift-right'}`}
              style={{
                top: `${20 + i * 20}%`,
                left: `${-20 + i * 12}%`,
                width: `${70 + i * 15}vw`,
                animationDuration: `${55 + i * 22}s`,
                animationDelay: `${-i * 17}s`,
                opacity: v.isDay ? 0.5 : 0.34
              }}
            />
          ))}
        </div>
      )}

      {v.lightning && !reduced && (
        <>
          <div className="we-flash" />
          <svg className="we-bolt" viewBox="0 0 32 64" preserveAspectRatio="none">
            <polygon points="18,2 10,34 16,34 12,62 24,26 17,26 23,2" />
          </svg>
        </>
      )}
    </div>
  );
}
export const fmtTemp = (t: number | null | undefined): string =>
  t == null || !Number.isFinite(t) ? '--' : `${Math.round(t)}°`;

export const fmtTemp1 = (t: number | null | undefined): string =>
  t == null || !Number.isFinite(t) ? '--' : `${t}°C`;

export const fmtPercent = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '--' : `${Math.round(v)}%`;

export const fmtNum = (v: number | null | undefined, places = 0): string =>
  v == null || !Number.isFinite(v) ? '--' : `${v.toFixed(places)}`;

export const fmtKmh = (v: number | null | undefined): string =>
  v == null || !Number.isFinite(v) ? '--' : `${v.toFixed(1)} km/h`;

export const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'goodMorning';
  if (h < 17) return 'goodAfternoon';
  return 'goodEvening';
}

export function windLabel(dir: string, speed: number | null): string {
  if (!Number.isFinite(speed as number)) return '--';
  const d = dir || '--';
  if (speed === 0) return 'Calm';
  return `${d} ${speed?.toFixed(1)} km/h`;
}

export function nbspHandling(s: string): string {
  return s;
}

export function isWithinHour(iso: string): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && Math.abs(Date.now() - d.getTime()) < 90 * 60 * 1000;
}
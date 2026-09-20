/**
 * WEATHER ENVIRONMENT ENGINE
 * ---------------------------
 * Pure, deterministic mapping from real weather data (CurrentWeather + forecast
 * + warnings) to a visual scene state for the immersive background. No UI here.
 * Every input value is optional so the engine degrades gracefully when a data
 * source is missing (just like the rest of MAUSAM — honest, labelled data).
 */

export type EnvironmentTheme = 'clear' | 'partly' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'fog' | 'haze';

export interface EnvironmentInput {
  condition: string | null;
  /** today's rain probability, 0..100 */
  rainProb: number | null;
  /** today's expected rainfall, mm */
  rainfall: number | null;
  /** current visibility, km */
  visibility: number | null;
  /** current humidity, % */
  humidity: number | null;
  /** current wind speed, km/h */
  windSpeed: number | null;
  /** wind direction the wind comes FROM, e.g. "SW" */
  windDirection: string | null;
  /** top official warning severity (watch/alerts...) or null */
  warningSeverity: 'watch' | 'alert' | 'warning' | 'no_warning' | null;
  now?: Date;
}

export interface EnvironmentVisual {
  isDay: boolean;
  theme: EnvironmentTheme;
  /** 0..1 how much of the sky clouds cover */
  cloudCover: number;
  /** 0..1 cloud drift speed factor */
  cloudSpeed: number;
  /** 1 = drift right, -1 = drift left */
  cloudDirection: 1 | -1;
  /** 0..1 rain intensity */
  rainIntensity: number;
  /** 0..1 fog density */
  fogIntensity: number;
  /** 0..1 storm severity (drives lightning frequency & wind streak) */
  stormIntensity: number;
  /** whether lightning can flash */
  lightning: boolean;
  /** daytime sun disc visible */
  sunVisible: boolean;
  /** true when the weather is theatrically heavy (rain/storm) */
  heavy: boolean;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** Which way the clouds drift based on the wind direction it comes FROM. */
function driftDirection(dir: string | null): 1 | -1 {
  if (!dir) return 1;
  const d = dir.toUpperCase();
  // Wind from the west pushes clouds toward the east (screen right).
  if (d.includes('W')) return 1;
  if (d.includes('E')) return -1;
  // N/S: gentle rightward drift by convention.
  return 1;
}

export function classifyTheme(input: EnvironmentInput): EnvironmentTheme {
  const c = (input.condition ?? '').toLowerCase();
  const words = (w: string) => c.includes(w);

  if (words('thunder') || words('storm') || words('squall')) return 'storm';
  if (words('fog') || words('foggy')) return 'fog';
  if (words('haze') || words('mist') || words('smoke') || words('dust') || words('sand')) return 'haze';
  if (words('snow') || words('sleet') || words('shower') || words('rain') || (input.rainfall ?? 0) > 0.05) return 'rain';
  if (words('overcast') || words('cloudy') || words('dull')) return 'overcast';
  if (words('partly') || words('scattered') || words('few')) return 'partly';
  if (words('clear') || words('sunny') || words('fair')) return 'clear';

  // Fallbacks when the condition string is not descriptive.
  const rp = input.rainProb ?? 0;
  const hum = input.humidity ?? 50;
  if (rp >= 60 || (input.rainfall ?? 0) >= 5) return 'rain';
  if (rp >= 35) return 'overcast';
  if (hum >= 90) return 'fog';
  if (hum >= 80) return 'haze';
  if (rp >= 15) return 'partly';
  return 'clear';
}

function cloudCoverFor(theme: EnvironmentTheme, humidity: number | null, rainProb: number | null): number {
  const h = clamp01((humidity ?? 50) / 100);
  const rp = clamp01((rainProb ?? 10) / 100);
  switch (theme) {
    case 'clear':
      return 0.08 + h * 0.25 + rp * 0.15;
    case 'partly':
      return 0.4 + h * 0.25;
    case 'cloudy':
      return 0.7 + h * 0.2;
    case 'overcast':
      return 0.85 + h * 0.15;
    case 'fog':
    case 'haze':
      return 0.55 + h * 0.3;
    case 'rain':
      return 0.75 + h * 0.2;
    case 'storm':
      return 0.9;
    default:
      return 0.5;
  }
}

function rainIntensityFor(theme: EnvironmentTheme, rainProb: number | null, rainfall: number | null): number {
  const rp = (rainProb ?? 0) / 100;
  const rf = Math.min(1, (rainfall ?? 0) / 40);
  switch (theme) {
    case 'rain':
      return clamp01(0.25 + rp * 0.5 + rf * 0.4);
    case 'storm':
      return clamp01(0.4 + rp * 0.4 + rf * 0.3);
    default:
      return 0;
  }
}

function fogIntensityFor(theme: EnvironmentTheme, humidity: number | null, visibility: number | null): number {
  if (theme === 'fog') return 0.85;
  if (theme === 'haze') return 0.5;
  const hum = clamp01((humidity ?? 50) / 100);
  if (hum > 0.82) return 0.3;
  if (visibility != null && visibility < 2.5) return 0.7;
  return 0;
}

function stormIntensityFor(theme: EnvironmentTheme, warningSeverity: EnvironmentInput['warningSeverity']): number {
  if (theme !== 'storm') return 0;
  let base = 0.55;
  if (warningSeverity === 'warning') base = 1;
  else if (warningSeverity === 'alert') base = 0.85;
  else if (warningSeverity === 'watch') base = 0.7;
  return base;
}

/**
 * Maps current weather data to a full visual scene. Deterministic & pure —
 * same input always yields the same scene.
 */
export function computeEnvironment(input: EnvironmentInput): EnvironmentVisual {
  const now = input.now ?? new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const isDay = hour >= 5.5 && hour < 18.5;

  const theme = classifyTheme(input);
  const cloudCover = cloudCoverFor(theme, input.humidity, input.rainProb);
  const windKmh = Math.max(0, input.windSpeed ?? 0);
  const cloudSpeed = clamp01(0.12 + (windKmh / 60) * 0.9);
  const rainIntensity = rainIntensityFor(theme, input.rainProb, input.rainfall);
  const fogIntensity = fogIntensityFor(theme, input.humidity, input.visibility);
  const stormIntensity = stormIntensityFor(theme, input.warningSeverity);

  const heavy = rainIntensity > 0.2 || fogIntensity > 0.6 || stormIntensity > 0.3;

  return {
    isDay,
    theme,
    cloudCover,
    cloudSpeed,
    cloudDirection: driftDirection(input.windDirection),
    rainIntensity,
    fogIntensity,
    stormIntensity,
    lightning: stormIntensity > 0.5,
    sunVisible: isDay && cloudCover < 0.62,
    heavy
  };
}

/** Gradient stops for the scene sky, keyed by theme + day/night. */
export const SKY_GRADIENTS: Record<EnvironmentTheme, { day: [string, string]; night: [string, string] }> = {
  clear: { day: ['#4aa8ff', '#bfe6ff'], night: ['#0b1d4d', '#1d2f63'] },
  partly: { day: ['#3d94f2', '#cfe6ff'], night: ['#0a1c47', '#22305f'] },
  cloudy: { day: ['#6b8aa8', '#c3d4e2'], night: ['#101b33', '#24304a'] },
  overcast: { day: ['#5b748c', '#aebecd'], night: ['#0e1729', '#1c273d'] },
  rain: { day: ['#4c6178', '#9fb3c4'], night: ['#0a121f', '#18222f'] },
  storm: { day: ['#39475a', '#7d8ea1'], night: ['#050a14', '#121a26'] },
  fog: { day: ['#9aa7b3', '#d8dfe6'], night: ['#202630', '#3a414d'] },
  haze: { day: ['#c9b37c', '#f0e0bd'], night: ['#2b2433', '#453a45'] }
};

export function skyGradient(v: EnvironmentVisual): [string, string] {
  const g = SKY_GRADIENTS[v.theme];
  return v.isDay ? g.day : g.night;
}
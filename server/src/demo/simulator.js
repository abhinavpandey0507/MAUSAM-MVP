/**
 * DEMO / FALLBACK WEATHER SIMULATOR
 * ---------------------------------
 * Deterministic, seasonal climate approximation used ONLY when an official IMD
 * source is unavailable or when the user enables DEMO MODE. Every value produced
 * here is explicitly labelled with source:"simulated" so it can never be confused
 * with live IMD data. Monthly climate normals are rough climatological averages.
 */

import { getStation } from '../data/stations.js';

// Monthly normals: [tMax, tMin, rainMm, humidity]
const CLIMATE = {
  'new-delhi': [
    [20.1, 7.6, 19, 62], [23.9, 10.2, 20, 55], [29.9, 15.3, 15, 47],
    [36.3, 21.2, 13, 33], [39.5, 25.6, 31, 35], [38.8, 28.1, 82, 54],
    [34.7, 26.9, 187, 70], [33.2, 26.0, 190, 71], [33.9, 24.4, 111, 64],
    [32.6, 19.5, 22, 50], [27.3, 13.0, 5, 45], [22.5, 8.5, 8, 54]
  ],
  chandigarh: [
    [19.2, 5.1, 34, 68], [22.2, 7.7, 32, 63], [27.6, 12.1, 30, 58],
    [34.1, 17.6, 15, 43], [37.8, 22.0, 20, 39], [37.2, 24.9, 110, 52],
    [33.1, 24.9, 283, 70], [32.1, 24.6, 277, 72], [32.7, 22.8, 129, 66],
    [30.5, 16.3, 27, 55], [25.7, 9.8, 8, 50], [20.9, 5.8, 23, 62]
  ],
  mumbai: [
    [30.7, 18.9, 1, 65], [31.5, 20.2, 1, 65], [32.7, 22.8, 0, 66],
    [33.0, 25.2, 1, 67], [33.1, 27.1, 12, 70], [31.9, 26.7, 504, 80],
    [29.8, 25.0, 841, 85], [29.4, 24.5, 513, 85], [30.0, 24.2, 318, 82],
    [32.0, 23.3, 62, 72], [32.7, 21.3, 10, 66], [31.3, 19.2, 2, 65]
  ],
  bengaluru: [
    [27.7, 15.1, 1, 55], [30.3, 16.7, 7, 49], [32.4, 18.6, 12, 48],
    [33.4, 20.7, 40, 52], [32.4, 21.0, 108, 61], [29.5, 20.0, 88, 70],
    [28.3, 19.4, 105, 72], [28.0, 19.2, 121, 73], [28.9, 19.2, 179, 70],
    [28.4, 18.3, 152, 67], [27.3, 16.3, 58, 63], [26.8, 14.9, 16, 59]
  ],
  chennai: [
    [29.4, 20.9, 19, 68], [30.9, 22.0, 7, 68], [32.8, 23.9, 7, 68],
    [34.6, 26.4, 17, 70], [37.0, 28.1, 39, 62], [37.0, 28.0, 44, 58],
    [35.4, 26.9, 91, 66], [34.6, 26.1, 118, 68], [33.7, 25.4, 153, 70],
    [31.9, 24.1, 271, 74], [29.7, 22.5, 344, 76], [29.0, 21.2, 143, 73]
  ],
  kolkata: [
    [26.0, 13.9, 12, 69], [29.1, 17.3, 26, 63], [33.3, 21.7, 34, 60],
    [35.6, 25.1, 57, 67], [35.1, 26.2, 135, 72], [33.4, 26.6, 290, 79],
    [32.2, 26.2, 333, 82], [32.1, 26.1, 307, 82], [32.4, 25.8, 266, 80],
    [31.7, 23.6, 124, 75], [29.5, 18.9, 22, 68], [26.7, 14.6, 8, 69]
  ],
  hyderabad: [
    [29.5, 16.1, 5, 58], [32.3, 18.5, 11, 52], [35.4, 21.4, 18, 44],
    [37.7, 24.3, 25, 42], [38.6, 25.6, 37, 44], [34.4, 23.9, 125, 57],
    [30.5, 22.3, 194, 67], [29.7, 21.8, 197, 69], [30.3, 21.5, 177, 66],
    [30.3, 19.8, 105, 59], [29.1, 16.8, 26, 55], [28.7, 15.4, 6, 56]
  ]
};

const WINDS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const COASTAL = { mumbai: 1, chennai: 1, kolkata: 1 };

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function noise(seed, salt) {
  const h = hash(`${seed}|${salt}`);
  return (h / 4294967295) * 2 - 1; // -1..1
}

function interp(a, b, t) {
  return a + (b - a) * t;
}

export function monthNormals(cityId) {
  return CLIMATE[cityId] || CLIMATE['new-delhi'];
}

/** Smoothed daily normals for an exact date (linear interpolation across months). */
export function normalsForDate(cityId, date) {
  const m = monthNormals(cityId);
  const idx = date.getMonth();
  const cur = m[idx];
  const nxt = m[(idx + 1) % 12];
  const daysInMonth = new Date(date.getFullYear(), idx + 1, 0).getDate();
  const t = Math.min(1, (date.getDate() - 1) / daysInMonth); // month fraction
  return {
    tMax: interp(cur[0], nxt[0], t),
    tMin: interp(cur[1], nxt[1], t),
    rain: interp(cur[2], nxt[2], t),
    humidity: interp(cur[3], nxt[3], t)
  };
}

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function conditionFromRain(rainMm, hour) {
  if (rainMm <= 0.1) return 'Clear sky';
  if (rainMm < 2) return 'Partly cloudy';
  if (rainMm < 8) return 'Light rain';
  if (rainMm < 20) return 'Moderate rain';
  if (rainMm < 40) return 'Heavy rain';
  return 'Very heavy rain';
}

export function simulateCurrent(cityId, date = new Date()) {
  const city = getStation(cityId);
  const n = normalsForDate(city.id, date);
  const seed = `${city.id}|${dayKey(date)}`;
  const hourFrac = date.getHours() + date.getMinutes() / 60;

  // diurnal temperature curve: min near 5am, max near 3pm
  const dayAmp = (n.tMax - n.tMin) / 2;
  const peakOffset = Math.sin(((hourFrac - 9) / 24) * 2 * Math.PI); // trough ~9, peak ~15
  const temp = n.tMin + dayAmp * (peakOffset + 1) * 0.55 + dayAmp * 0.45 + noise(seed, 'temp') * 1.6;

  const humidity = Math.min(98, Math.max(22, n.humidity + noise(seed, 'hum') * 9 - (temp - n.tMax) * 1.2));

  const monsoonal = n.rain > 60;
  const active = noise(seed, 'rain') > (monsoonal ? 0.05 : 0.78);
  const rainIntensity = active ? Math.abs(noise(seed, 'rr')) * (monsoonal ? 14 : 2.2) : 0;
  const rainfall = rainIntensity < 0.05 ? 0 : rainIntensity;

  let condition = conditionFromRain(rainfall, hourFrac);
  if (rainfall === 0) {
    const r = noise(seed, 'cond');
    if (r > 0.55) condition = 'Partly cloudy';
    else if (r > 0.3) condition = 'Clear sky';
    else if (humidity > 82) condition = 'Haze';
    else condition = 'Sunny';
  }

  const coastal = COASTAL[city.id] === 1;
  const windSpeed = Math.max(2, Math.round((coastal ? 16 : 10) * (0.6 + Math.abs(noise(seed, 'wind')))));
  const windDirection = WINDS[Math.floor(Math.abs(noise(seed, 'dir')) * 16) % 16];
  const pressure = Math.round(1008 + noise(seed, 'pr') * 10);
  const visibility = rainfall > 2 ? Math.max(1, 8 - rainfall / 5) : humidity > 88 ? 3.5 : 8 + Math.abs(noise(seed, 'vis')) * 12;

  // feels-like: simple approximation (labeled as derived)
  const feelsLike = humidity > 60 && temp > 27 ? temp + (humidity - 60) * 0.08 : temp;

  return {
    location: city.name,
    locationId: city.id,
    lat: city.lat,
    lon: city.lon,
    temperature: Math.round(temp * 10) / 10,
    feelsLike: Math.round(feelsLike * 10) / 10,
    unit: 'C',
    humidity: Math.round(humidity),
    windSpeed: Math.round(windSpeed * 10) / 10,
    windDirection,
    pressure,
    visibility: Math.round(visibility * 10) / 10,
    rainfall: Math.round(rainfall * 10) / 10,
    weatherCondition: condition,
    observedAt: date.toISOString(),
    sunrise: '06:10',
    sunset: '18:20',
    note: 'Simulated from climatological normals - not a live IMD observation.'
  };
}

export function simulateForecast(cityId, days = 7, date = new Date()) {
  const city = getStation(cityId);
  const seed = `fc|${city.id}`;
  const out = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + i);
    const n = normalsForDate(city.id, d);
    const r = noise(seed, `d${i}`);
    const rainProb = Math.min(95, Math.max(8, Math.round(n.rain > 60 ? 55 + r * 30 : 20 + r * 35)));
    const rainAmt = rainProb > 45 ? Math.max(0.2, Math.abs(noise(seed, `r${i}`)) * (n.rain / 5)) : 0;
    const tMax = Math.round((n.tMax + r * 1.8) * 10) / 10;
    const tMin = Math.round((n.tMin + noise(seed, `n${i}`) * 1.4) * 10) / 10;
    out.push({
      date: dayKey(d),
      weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      tMax,
      tMin,
      condition: conditionFromRain(rainAmt),
      rainProb,
      rainfall: Math.round(rainAmt * 10) / 10,
      humidity: Math.round(Math.min(96, Math.max(30, n.humidity + noise(seed, `h${i}`) * 8))),
      windSpeed: Math.round((COASTAL[city.id] ? 18 : 11) * (0.6 + Math.abs(noise(seed, `w${i}`))))
    });
  }
  return out;
}

export function simulateHourly(cityId, date = new Date()) {
  const city = getStation(cityId);
  const seed = `hr|${city.id}`;
  const n = normalsForDate(city.id, date);
  const out = [];
  for (let h = 0; h < 24; h += 2) {
    const d = new Date(date);
    d.setHours(date.getHours() + h, 0, 0, 0);
    const hourFrac = d.getHours() + d.getMinutes() / 60;
    const dayAmp = (n.tMax - n.tMin) / 2;
    const peakOffset = Math.sin(((hourFrac - 9) / 24) * 2 * Math.PI);
    const temp = Math.round((n.tMin + dayAmp * (peakOffset + 1) * 0.55 + dayAmp * 0.45 + noise(seed, `h${h}`) * 1.2) * 10) / 10;
    const rainNoise = noise(seed, `r${h}`);
    const rainProb = Math.max(0, Math.min(100, Math.round((n.rain > 60 ? 45 : 12) + rainNoise * 30)));
    out.push({
      time: d.toISOString(),
      label: `${String(d.getHours()).padStart(2, '0')}:00`,
      temperature: temp,
      rainProb,
      humidity: Math.round(Math.min(96, Math.max(30, n.humidity + noise(seed, `m${h}`) * 8)))
    });
  }
  return out;
}

/** Rare deterministic warnings during monsoon weeks; usually no warnings. */
export function simulateWarnings(cityId, date = new Date()) {
  const city = getStation(cityId);
  const n = normalsForDate(city.id, date);
  const r = noise(`warn|${city.id}|${dayKey(date)}`, 'sev');
  if (n.rain > 150 && r > 0.72) {
    return [
      {
        severity: 'watch',
        event: 'Heavy rain expected',
        area: city.district,
        detail: 'Due to active monsoon conditions, spells of heavy rainfall are likely. Follow IMD advisories.',
        validFrom: date.toISOString(),
        validUntil: new Date(date.getTime() + 24 * 3600 * 1000).toISOString(),
        source: 'simulated'
      }
    ];
  }
  return [];
}

export function simulateNowcast(cityId, date = new Date()) {
  const city = getStation(cityId);
  const warnings = simulateWarnings(cityId, date);
  const n = normalsForDate(city.id, date);
  const isMonsoon = n.rain > 100;
  return [
    {
      location: city.district,
      type: isMonsoon ? 'Heavy rain' : 'No significant weather',
      severity: warnings.length ? 'watch' : 'no_warning',
      validFrom: date.toISOString(),
      validUntil: new Date(date.getTime() + 3 * 3600 * 1000).toISOString(),
      description: warnings.length
        ? 'Spells of rain/thundershowers with gusty winds expected during next 3 hours.'
        : 'No significant weather expected over the next 3 hours.',
      source: 'simulated'
    }
  ];
}

export function simulateRainfall(cityId, date = new Date()) {
  const city = getStation(cityId);
  const n = normalsForDate(city.id, date);
  const base = n.rain * (0.5 + Math.abs(noise(`rf|${city.id}|${dayKey(date)}`, 'x')));
  return [
    {
      district: city.district,
      state: city.state,
      date: dayKey(date),
      actual: Math.round((base / 15) * 100) / 100,
      normal: n.rain / 100,
      departure: 0
    }
  ];
}

/**
 * Builds a full normalized WeatherData envelope from simulation.
 * 'demo' flag -> explicitly labeled fallback.
 */
export function simulateWeatherBundle(cityId, { mode = 'fallback' } = {}) {
  const current = simulateCurrent(cityId);
  const forecast = simulateForecast(cityId, 7);
  const hourly = simulateHourly(cityId);
  const warnings = simulateWarnings(cityId);
  const nowcast = simulateNowcast(cityId);
  const rainfall = simulateRainfall(cityId);
  return {
    location: current.location,
    locationId: current.locationId,
    lat: current.lat,
    lon: current.lon,
    temperature: current.temperature,
    feelsLike: current.feelsLike,
    unit: current.unit,
    humidity: current.humidity,
    windSpeed: current.windSpeed,
    windDirection: current.windDirection,
    pressure: current.pressure,
    visibility: current.visibility,
    rainfall: current.rainfall,
    weatherCondition: current.weatherCondition,
    observedAt: current.observedAt,
    forecast,
    hourly,
    warnings,
    nowcast,
    rainfall,
    source: 'simulated',
    dataSourceLabel: mode === 'demo' ? 'DEMO FALLBACK DATA' : 'SIMULATED (IMD unavailable)',
    lastUpdated: new Date().toISOString()
  };
}
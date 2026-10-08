"""DEMO / FALLBACK WEATHER SIMULATOR
------------------------------------
Deterministic, seasonal climate approximation used ONLY when an official IMD
source is unavailable or when the user enables DEMO MODE. Every value produced
here is explicitly labelled source="simulated" so it can never be confused with
live IMD data. Monthly climate normals are rough climatological averages.

Faithful port of the original Node simulator (same FNV-1a hash, same math), so a
given city/day/hour always produces identical values across the two backends.
"""

import math
from datetime import datetime, timedelta, timezone, date as _date

from .stations import get_station

# Monthly normals: [tMax, tMin, rainMm, humidity]
CLIMATE = {
    "new-delhi": [
        [20.1, 7.6, 19, 62], [23.9, 10.2, 20, 55], [29.9, 15.3, 15, 47],
        [36.3, 21.2, 13, 33], [39.5, 25.6, 31, 35], [38.8, 28.1, 82, 54],
        [34.7, 26.9, 187, 70], [33.2, 26.0, 190, 71], [33.9, 24.4, 111, 64],
        [32.6, 19.5, 22, 50], [27.3, 13.0, 5, 45], [22.5, 8.5, 8, 54],
    ],
    "chandigarh": [
        [19.2, 5.1, 34, 68], [22.2, 7.7, 32, 63], [27.6, 12.1, 30, 58],
        [34.1, 17.6, 15, 43], [37.8, 22.0, 20, 39], [37.2, 24.9, 110, 52],
        [33.1, 24.9, 283, 70], [32.1, 24.6, 277, 72], [32.7, 22.8, 129, 66],
        [30.5, 16.3, 27, 55], [25.7, 9.8, 8, 50], [20.9, 5.8, 23, 62],
    ],
    "mumbai": [
        [30.7, 18.9, 1, 65], [31.5, 20.2, 1, 65], [32.7, 22.8, 0, 66],
        [33.0, 25.2, 1, 67], [33.1, 27.1, 12, 70], [31.9, 26.7, 504, 80],
        [29.8, 25.0, 841, 85], [29.4, 24.5, 513, 85], [30.0, 24.2, 318, 82],
        [32.0, 23.3, 62, 72], [32.7, 21.3, 10, 66], [31.3, 19.2, 2, 65],
    ],
    "bengaluru": [
        [27.7, 15.1, 1, 55], [30.3, 16.7, 7, 49], [32.4, 18.6, 12, 48],
        [33.4, 20.7, 40, 52], [32.4, 21.0, 108, 61], [29.5, 20.0, 88, 70],
        [28.3, 19.4, 105, 72], [28.0, 19.2, 121, 73], [28.9, 19.2, 179, 70],
        [28.4, 18.3, 152, 67], [27.3, 16.3, 58, 63], [26.8, 14.9, 16, 59],
    ],
    "chennai": [
        [29.4, 20.9, 19, 68], [30.9, 22.0, 7, 68], [32.8, 23.9, 7, 68],
        [34.6, 26.4, 17, 70], [37.0, 28.1, 39, 62], [37.0, 28.0, 44, 58],
        [35.4, 26.9, 91, 66], [34.6, 26.1, 118, 68], [33.7, 25.4, 153, 70],
        [31.9, 24.1, 271, 74], [29.7, 22.5, 344, 76], [29.0, 21.2, 143, 73],
    ],
    "kolkata": [
        [26.0, 13.9, 12, 69], [29.1, 17.3, 26, 63], [33.3, 21.7, 34, 60],
        [35.6, 25.1, 57, 67], [35.1, 26.2, 135, 72], [33.4, 26.6, 290, 79],
        [32.2, 26.2, 333, 82], [32.1, 26.1, 307, 82], [32.4, 25.8, 266, 80],
        [31.7, 23.6, 124, 75], [29.5, 18.9, 22, 68], [26.7, 14.6, 8, 69],
    ],
    "hyderabad": [
        [29.5, 16.1, 5, 58], [32.3, 18.5, 11, 52], [35.4, 21.4, 18, 44],
        [37.7, 24.3, 25, 42], [38.6, 25.6, 37, 44], [34.4, 23.9, 125, 57],
        [30.5, 22.3, 194, 67], [29.7, 21.8, 197, 69], [30.3, 21.5, 177, 66],
        [30.3, 19.8, 105, 59], [29.1, 16.8, 26, 55], [28.7, 15.4, 6, 56],
    ],
}

WINDS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
COASTAL = {"mumbai": 1, "chennai": 1, "kolkata": 1}

_JS_ROUND = lambda x: math.floor(x + 0.5)  # JS Math.round (half away from zero)


def _hash(s: str) -> int:
    """FNV-1a 32-bit (matches the Node simulator exactly)."""
    h = 2166136261
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def _noise(seed: str, salt: str):
    h = _hash(f"{seed}|{salt}")
    return (h / 4294967295) * 2 - 1


def _interp(a, b, t):
    return a + (b - a) * t


def month_normals(city_id):
    return CLIMATE.get(city_id) or CLIMATE["new-delhi"]


def normals_for_date(city_id, dt: _date):
    m = month_normals(city_id)
    idx = dt.month - 1
    cur = m[idx]
    nxt = m[(idx + 1) % 12]
    import calendar

    days_in_month = calendar.monthrange(dt.year, dt.month)[1]
    t = min(1, (dt.day - 1) / days_in_month)
    return {
        "tMax": _interp(cur[0], nxt[0], t),
        "tMin": _interp(cur[1], nxt[1], t),
        "rain": _interp(cur[2], nxt[2], t),
        "humidity": _interp(cur[3], nxt[3], t),
    }


def _day_key(d: _date):
    return f"{d.year}-{str(d.month).zfill(2)}-{str(d.day).zfill(2)}"


def _condition_from_rain(rain_mm, hour=None):
    if rain_mm <= 0.1:
        return "Clear sky"
    if rain_mm < 2:
        return "Partly cloudy"
    if rain_mm < 8:
        return "Light rain"
    if rain_mm < 20:
        return "Moderate rain"
    if rain_mm < 40:
        return "Heavy rain"
    return "Very heavy rain"


def simulate_current(city_id, now=None):
    now = now or datetime.now(timezone.utc)
    city = get_station(city_id)
    n = normals_for_date(city["id"], now.date())
    seed = f"{city['id']}|{_day_key(now.date())}"
    hour_frac = now.hour + now.minute / 60

    day_amp = (n["tMax"] - n["tMin"]) / 2
    peak_offset = math.sin(((hour_frac - 9) / 24) * 2 * math.pi)
    temp = n["tMin"] + day_amp * (peak_offset + 1) * 0.55 + day_amp * 0.45 + _noise(seed, "temp") * 1.6

    humidity = min(98, max(22, n["humidity"] + _noise(seed, "hum") * 9 - (temp - n["tMax"]) * 1.2))

    monsoonal = n["rain"] > 60
    active = _noise(seed, "rain") > (0.05 if monsoonal else 0.78)
    rain_intensity = abs(_noise(seed, "rr")) * (14 if monsoonal else 2.2) if active else 0
    rainfall = 0 if rain_intensity < 0.05 else rain_intensity

    condition = _condition_from_rain(rainfall, hour_frac)
    if rainfall == 0:
        r = _noise(seed, "cond")
        if r > 0.55:
            condition = "Partly cloudy"
        elif r > 0.3:
            condition = "Clear sky"
        elif humidity > 82:
            condition = "Haze"
        else:
            condition = "Sunny"

    coastal = COASTAL.get(city["id"]) == 1
    wind_speed = max(2, round((16 if coastal else 10) * (0.6 + abs(_noise(seed, "wind")))))
    wind_direction = WINDS[int((abs(_noise(seed, "dir")) * 16)) % 16]
    pressure = round(1008 + _noise(seed, "pr") * 10)
    visibility = (max(1, 8 - rainfall / 5) if rainfall > 2 else (3.5 if humidity > 88 else 8 + abs(_noise(seed, "vis")) * 12))

    feels_like = temp + (humidity - 60) * 0.08 if (humidity > 60 and temp > 27) else temp

    return {
        "location": city["name"],
        "locationId": city["id"],
        "lat": city["lat"],
        "lon": city["lon"],
        "temperature": _JS_ROUND(temp * 10) / 10,
        "feelsLike": _JS_ROUND(feels_like * 10) / 10,
        "unit": "C",
        "humidity": round(humidity),
        "windSpeed": _JS_ROUND(wind_speed * 10) / 10,
        "windDirection": wind_direction,
        "pressure": round(pressure),
        "visibility": _JS_ROUND(visibility * 10) / 10,
        "rainfall": _JS_ROUND(rainfall * 10) / 10,
        "weatherCondition": condition,
        "observedAt": now.isoformat(),
        "sunrise": "06:10",
        "sunset": "18:20",
        "note": "Simulated from climatological normals - not a live IMD observation.",
    }


def simulate_forecast(city_id, days=7, now=None):
    now = now or datetime.now(timezone.utc)
    city = get_station(city_id)
    seed = f"fc|{city['id']}"
    out = []
    for i in range(days):
        d = _date(now.year, now.month, now.day) + timedelta(days=i)
        n = normals_for_date(city["id"], d)
        r = _noise(seed, f"d{i}")
        rain_prob = min(95, max(8, round(55 + r * 30 if n["rain"] > 60 else 20 + r * 35)))
        rain_amt = max(0.2, abs(_noise(seed, f"r{i}")) * (n["rain"] / 5)) if rain_prob > 45 else 0
        t_max = _JS_ROUND((n["tMax"] + r * 1.8) * 10) / 10
        t_min = _JS_ROUND((n["tMin"] + _noise(seed, f"n{i}") * 1.4) * 10) / 10
        out.append(
            {
                "date": _day_key(d),
                "weekday": d.strftime("%a"),
                "tMax": t_max,
                "tMin": t_min,
                "condition": _condition_from_rain(rain_amt),
                "rainProb": rain_prob,
                "rainfall": _JS_ROUND(rain_amt * 10) / 10,
                "humidity": round(min(96, max(30, n["humidity"] + _noise(seed, f"h{i}") * 8))),
                "windSpeed": round((18 if COASTAL.get(city["id"]) else 11) * (0.6 + abs(_noise(seed, f"w{i}")))),
            }
        )
    return out


def simulate_hourly(city_id, now=None):
    now = now or datetime.now(timezone.utc)
    city = get_station(city_id)
    seed = f"hr|{city['id']}"
    n = normals_for_date(city["id"], now.date())
    out = []
    base = now.replace(minute=0, second=0, microsecond=0)
    for step in range(0, 24, 2):
        d = base + timedelta(hours=step)
        hour_frac = d.hour + d.minute / 60
        day_amp = (n["tMax"] - n["tMin"]) / 2
        peak_offset = math.sin(((hour_frac - 9) / 24) * 2 * math.pi)
        temp = _JS_ROUND((n["tMin"] + day_amp * (peak_offset + 1) * 0.55 + day_amp * 0.45 + _noise(seed, f"h{hour_frac}") * 1.2) * 10) / 10
        rain_noise = _noise(seed, f"r{hour_frac}")
        rain_prob = max(0, min(100, round((45 if n["rain"] > 60 else 12) + rain_noise * 30)))
        out.append(
            {
                "time": d.isoformat(),
                "label": f"{str(d.hour).zfill(2)}:00",
                "temperature": temp,
                "rainProb": rain_prob,
                "humidity": round(min(96, max(30, n["humidity"] + _noise(seed, f"m{hour_frac}") * 8))),
            }
        )
    return out


def simulate_warnings(city_id, now=None):
    now = now or datetime.now(timezone.utc)
    city = get_station(city_id)
    n = normals_for_date(city["id"], now.date())
    r = _noise(f"warn|{city['id']}|{_day_key(now.date())}", "sev")
    if n["rain"] > 150 and r > 0.72:
        return [
            {
                "severity": "watch",
                "event": "Heavy rain expected",
                "area": city["district"],
                "detail": "Due to active monsoon conditions, spells of heavy rainfall are likely. Follow IMD advisories.",
                "validFrom": now.isoformat(),
                "validUntil": (now + timedelta(hours=24)).isoformat(),
                "source": "simulated",
            }
        ]
    return []


def simulate_nowcast(city_id, now=None):
    now = now or datetime.now(timezone.utc)
    city = get_station(city_id)
    warnings = simulate_warnings(city_id, now)
    n = normals_for_date(city["id"], now.date())
    is_monsoon = n["rain"] > 100
    return [
        {
            "location": city["district"],
            "type": "Heavy rain" if is_monsoon else "No significant weather",
            "severity": "watch" if warnings else "no_warning",
            "validFrom": now.isoformat(),
            "validUntil": (now + timedelta(hours=3)).isoformat(),
            "description": (
                "Spells of rain/thundershowers with gusty winds expected during next 3 hours."
                if warnings
                else "No significant weather expected over the next 3 hours."
            ),
            "source": "simulated",
        }
    ]


def simulate_rainfall(city_id, now=None):
    now = now or datetime.now(timezone.utc)
    city = get_station(city_id)
    n = normals_for_date(city["id"], now.date())
    base = n["rain"] * (0.5 + abs(_noise(f"rf|{city['id']}|{_day_key(now.date())}", "x")))
    return [
        {
            "district": city["district"],
            "state": city["state"],
            "date": _day_key(now.date()),
            "actual": round((base / 15) * 100) / 100,
            "normal": n["rain"] / 100,
            "departure": 0,
        }
    ]


def simulate_weather_bundle(city_id, mode="fallback"):
    current = simulate_current(city_id)
    forecast = simulate_forecast(city_id, 7)
    hourly = simulate_hourly(city_id)
    warnings = simulate_warnings(city_id)
    nowcast = simulate_nowcast(city_id)
    rainfall = simulate_rainfall(city_id)
    return {
        "location": current["location"],
        "locationId": current["locationId"],
        "lat": current["lat"],
        "lon": current["lon"],
        "temperature": current["temperature"],
        "feelsLike": current["feelsLike"],
        "unit": current["unit"],
        "humidity": current["humidity"],
        "windSpeed": current["windSpeed"],
        "windDirection": current["windDirection"],
        "pressure": current["pressure"],
        "visibility": current["visibility"],
        "rainfall": current["rainfall"],
        "weatherCondition": current["weatherCondition"],
        "observedAt": current["observedAt"],
        "forecast": forecast,
        "hourly": hourly,
        "warnings": warnings,
        "nowcast": nowcast,
        "rainfall": rainfall,
        "source": "simulated",
        "dataSourceLabel": "DEMO FALLBACK DATA" if mode == "demo" else "SIMULATED (IMD unavailable)",
        "dataMode": "fallback",
        "anyLive": False,
        "imdUnavailable": True,
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    }
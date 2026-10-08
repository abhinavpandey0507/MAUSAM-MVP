"""Tolerant parsers converting various IMD response shapes (page HTML, legacy
JSON) into MAUSAM's normalized objects. The UI never touches raw IMD structures.
"""

import math
import re
from datetime import datetime, timezone

from .http_client import to_num, pick, find_value_near  # noqa: F401 (re-exported helpers)

_strip = lambda s: re.sub(r"\s+", " ", str(s if s is not None else "")).strip()  # noqa: E731


def _search(pattern, text, flags=0):
    m = re.search(pattern, text, flags)
    return m.group(1) if m else None


def parse_observation_html(html, station):
    """Observation card block on https://mausam.imd.gov.in/ (or a regional page)."""
    div_idx = html.find('id="city_weather"')
    idx = div_idx if div_idx >= 0 else html.find('class="city_weather"')
    if idx < 0:
        return None
    keep = html[idx : min(len(html), idx + 1800)]

    def _match(pattern, flags=0):
        m = re.search(pattern, keep, flags)
        return m if m else None

    temp_m = (
        _match(r"(\d{1,3}(?:\.\d+)?)\s*(?:°|&deg;|deg|C)", re.IGNORECASE)
        or _match(r"(\d{1,3}(?:\.\d+)?)<sup>o</sup>\s*C", re.IGNORECASE)
        or _match(r"(-?\d{1,3}(?:\.\d+)?)\s*[o°]?\s*C", re.IGNORECASE)
    )
    feels_m = _match(r"Feel Like\s*(\d{1,3}(?:\.\d+)?)", re.IGNORECASE)
    hum_m = _match(r"(\d{1,3})\s*%")
    wind_m = _match(r"([A-Za-z]{2,3})\s*(\d{1,3}(?:\.\d+)?)\s*K?m/h", re.IGNORECASE) or _match(
        r"(Calm)\s*(\d{1,3}(?:\.\d+)?)?\s*K?m/h", re.IGNORECASE
    )
    time_m = _match(r"Observation time\s*:\s*([\d\-: ]+)", re.IGNORECASE)
    cond_m = _match(r"<span>([^<]+)</span>")
    h3_m = _match(r"<h3>([^<]+)</h3>")

    temperature = to_num(temp_m.group(1)) if temp_m else float("nan")
    # Plausibility guard: a scraping smudge must never be presented as live data.
    if not math.isfinite(temperature) or temperature < -30 or temperature > 60:
        return None

    humidity = to_num(hum_m.group(1)) if hum_m else float("nan")
    wind_speed = (
        to_num(wind_m.group(2)) if wind_m and wind_m.group(2) is not None else (0.0 if wind_m else float("nan"))
    )
    station_name = _strip(h3_m.group(1)) if h3_m else (station.get("obs_name") or station.get("name"))

    felt = to_num(feels_m.group(1)) if feels_m else temperature

    return {
        "temperature": temperature,
        "feelsLike": felt if math.isfinite(felt) else temperature,
        "humidity": humidity,
        "windSpeed": wind_speed,
        "windDirection": wind_m.group(1) if wind_m else "",
        "pressure": float("nan"),
        "visibility": float("nan"),
        "rainfall": float("nan"),
        "weatherCondition": _strip(cond_m.group(1)) if cond_m else "",
        "observedAt": _strip(time_m.group(1)) if time_m else datetime.now(timezone.utc).isoformat(),
        "stationName": station_name,
        "rawTextSnippet": re.sub(r"\s+", " ", keep)[:220],
    }


def parse_v1_current(data):
    row = data[0] if isinstance(data, list) else data
    if not isinstance(row, dict):
        return None
    temperature = to_num(pick(row, ["Temperature", "TEMPERATURE", "Temp", "Temparature", "Temp C", "tC"]) or float("nan"))
    if not math.isfinite(temperature):
        return None
    fav = pick(row, ["Feel Like", "Feels Like", "FEELS_LIKE", "Feel_like"])
    return {
        "temperature": temperature,
        "feelsLike": to_num(fav) if fav is not None else temperature,
        "humidity": to_num(pick(row, ["Humidity", "RH", "Relative Humidity", "RH%", "humidity"])),
        "windSpeed": to_num(pick(row, ["Wind Speed", "Wind", "WindSpeed", "WS km/h"])),
        "windDirection": _strip(pick(row, ["Wind Direction", "WD", "Direction"])),
        "pressure": to_num(pick(row, ["Pressure", "SLP", "MSLP"])),
        "rainfall": to_num(pick(row, ["Rainfall", "Rain", "Rain mm", "Precipitation"])),
        "weatherCondition": _strip(pick(row, ["Weather Condition", "Condition", "Wx", "Sky Condition", "VWS STATUS"])),
        "observedAt": _strip(pick(row, ["Observation Time", "Observation time", "Time", "Date & Time", "DateTime"]))
        or datetime.now(timezone.utc).isoformat(),
        "stationName": _strip(pick(row, ["Station", "Station Name", "StationName", "State"])),
    }


def forecast_row_to_day(row):
    t_max = to_num(pick(row, ["tmax", "Tmax", "TMAX", "Max Temp", "max_temp"]) or float("nan"))
    t_min = to_num(pick(row, ["tmin", "Tmin", "TMIN", "Min Temp", "min_temp"]) or float("nan"))
    if not math.isfinite(t_max):
        return None
    return {
        "date": _strip(pick(row, ["date", "Date", "dt", "FcDate"])),
        "weekday": _strip(pick(row, ["day", "Day", "wd", "week"])),
        "tMax": t_max,
        "tMin": t_min,
        "condition": _strip(pick(row, ["cond", "Condition", "Forecast", "description", "weather"])),
        "rainProb": to_num(pick(row, ["rainprob", "RainProb", "Rain Probability", "pop", "PoP"])),
        "rainfall": to_num(pick(row, ["rain", "Rain", "rainfall", "Rainfall", "mm"])),
        "humidity": to_num(pick(row, ["hum", "Humidity", "RH"])),
        "windSpeed": to_num(pick(row, ["wind", "Wind", "Wind Speed", "ws"])),
    }


def parse_v1_forecast(data):
    lst = data if isinstance(data, list) else (data.get("FC") or data.get("Forecast") or data.get("records") or data.get("data"))
    if not isinstance(lst, list):
        return None
    days = [d for d in (forecast_row_to_day(r) for r in lst) if d]
    return days[:7] if days else None


def normalize_severity(raw):
    s = str(raw if raw is not None else "").upper()
    if re.search(r"NO WARNING|NO-WARNING|NIL|OK", s):
        return "no_warning"
    if re.search(r"WARNING|SEVERE|RED", s):
        return "warning"
    if re.search(r"ALERT|ORANGE", s):
        return "alert"
    if re.search(r"WATCH|YELLOW", s):
        return "watch"
    return "watch" if s else "no_warning"


def parse_v1_nowcast(data):
    lst = data if isinstance(data, list) else (data.get("nowcast") or data.get("records") or [])
    if not isinstance(lst, list):
        return []
    rows = []
    for row in lst:
        if not isinstance(row, dict):
            continue
        rows.append(
            {
                "location": _strip(pick(row, ["District", "district", "Station", "station", "Name", "Region"])),
                "type": _strip(pick(row, ["Event", "event", "Nowcast", "Weather", "Phenomenon"])),
                "severity": normalize_severity(_strip(pick(row, ["Severity", "severity", "Warning Class", "Category"]))),
                "validFrom": _strip(pick(row, ["From", "Validity", "valid_from", "Valid From", "Start"])),
                "validUntil": _strip(pick(row, ["To", "valid_until", "Valid Upto", "End"])),
                "description": _strip(pick(row, ["Description", "details", "Remarks", "Detail"])),
                "source": "imd",
            }
        )
    return [n for n in rows if n["location"] or n["type"]][:12]


def parse_v1_warnings(data):
    lst = data if isinstance(data, list) else (data.get("warnings") or data.get("records") or [])
    if not isinstance(lst, list):
        return []
    rows = []
    for row in lst:
        if not isinstance(row, dict):
            continue
        rows.append(
            {
                "severity": normalize_severity(_strip(pick(row, ["Warning", "Severity", "warning_class", "Color Code", "Level"]))),
                "event": _strip(pick(row, ["Event", "event", "Weather", "Phenomenon", "Impact", "warning_txt"])),
                "area": _strip(pick(row, ["Area", "District", "district", "State", "Region", "Division"])),
                "validFrom": _strip(pick(row, ["From", "Valid From", "valid_from", "Start Date"])),
                "validUntil": _strip(pick(row, ["To", "Valid Upto", "valid_until", "End Date"])),
                "source": "imd",
            }
        )
    return [w for w in rows if w["event"] or w["area"]][:15]


def parse_v1_rainfall(data):
    lst = data if isinstance(data, list) else (data.get("rainfall") or data.get("records") or [])
    if not isinstance(lst, list):
        return []
    rows = []
    for row in lst:
        if not isinstance(row, dict):
            continue
        actual = to_num(pick(row, ["Daily Actual", "Actual", "Rainfall", "rain_mm"]) or float("nan"))
        norm = to_num(pick(row, ["Normal", "normal"]) or float("nan"))
        rows.append(
            {
                "district": _strip(pick(row, ["District", "district"])),
                "state": _strip(pick(row, ["State", "state"])),
                "date": _strip(pick(row, ["Date", "date"])),
                "actual": actual if math.isfinite(actual) else 0,
                "normal": norm if math.isfinite(norm) else 0,
                "departure": 0,
                "source": "imd",
            }
        )
    return [r for r in rows if r["district"]][:15]


def severity_from_text(text):
    s = str(text if text is not None else "").upper()
    for tok in ["SEVERE", "WARNING", "ALERT", "WATCH", "CAUTION"]:
        if tok in s:
            return {"severity": ("warning" if tok == "SEVERE" else tok.lower())}
    return {"severity": "no_warning"}
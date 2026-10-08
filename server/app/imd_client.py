"""IMD DATA CLIENT (KEY-LESS)
-----------------------------
Fetches CURRENT observation via the public IMD page scrape and district-level
forecast / nowcast / warnings / rainfall via IMD's legacy (key-less) endpoints.
There is deliberately NO API key anywhere in this file. If any endpoint is
unreachable or changes shape, the caller falls back to the deterministic
simulator rather than failing the whole request.
"""
import html as _html
import re
from datetime import datetime, timezone

from . import config
from .http_client import fetch_text, fetch_json
from .parsers import parse_observation_html, parse_v1_forecast, parse_v1_nowcast, parse_v1_warnings, parse_v1_rainfall


def _clean(s):
    if s is None:
        return ""
    s = _html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


async def get_observation(station):
    url = f"{config.SITE_BASE}/{station['site_slug']}/"
    res = await fetch_text(url, timeout_ms=config.TIMEOUTS["current"])
    if not res["ok"]:
        return {"ok": False, "status": res["status"], "data": None, "error": f"scrape HTTP {res['status']}"}
    parsed = parse_observation_html(res["text"], station)
    if not parsed:
        return {"ok": False, "status": 200, "data": None, "error": "scrape-no-block"}
    return {"ok": True, "status": 200, "data": parsed, "error": None}


async def get_forecast(station):
    url = f"{config.CITY_BASE}/cityweather.php?cityid={station['forecast_id']}"
    res = await fetch_text(url, timeout_ms=config.TIMEOUTS["forecast"])
    if not res["ok"]:
        return {"ok": False, "status": res["status"], "data": None, "error": f"HTTP {res['status']}"}
    days = parse_v1_forecast(res["text"].strip()) if res["text"].strip() else None
    if not days:
        return {"ok": False, "status": 200, "data": None, "error": "forecast-empty"}
    return {"ok": True, "status": 200, "data": days, "error": None}


async def get_district_nowcast(station):
    url = (
        f"{config.IMD_LEGACY_BASE}/nowcast_district_api.php?ENABLE_NC=TRUE"
        f"&state={station['state'].replace(' ', '%20')}"
        f"&district={station['district'].replace(' ', '%20')}"
    )
    res = await fetch_json(url, timeout_ms=config.TIMEOUTS["nowcast"])
    if not res["ok"]:
        return {"ok": False, "status": res["status"], "data": None, "error": res["error"]}
    rows = parse_v1_nowcast(res["data"])
    if not rows:
        return {"ok": False, "status": 200, "data": None, "error": "nowcast-empty"}
    return {"ok": True, "status": 200, "data": rows, "error": None}


async def get_district_warnings(station):
    url = (
        f"{config.IMD_LEGACY_BASE}/warnings_district_api.php"
        f"?state={station['state'].replace(' ', '%20')}"
        f"&district={station['district'].replace(' ', '%20')}"
    )
    res = await fetch_json(url, timeout_ms=config.TIMEOUTS["warnings"])
    if not res["ok"]:
        return {"ok": False, "status": res["status"], "data": None, "error": res["error"]}
    rows = parse_v1_warnings(res["data"])
    if not rows:
        return {"ok": False, "status": 200, "data": None, "error": "warnings-empty"}
    return {"ok": True, "status": 200, "data": rows, "error": None}


async def get_district_rainfall(station):
    url = (
        f"{config.IMD_LEGACY_BASE}/districtwise_rainfall_api.php"
        f"?state={station['state'].replace(' ', '%20')}"
    )
    res = await fetch_json(url, timeout_ms=config.TIMEOUTS["warnings"])
    if not res["ok"]:
        return {"ok": False, "status": res["status"], "data": None, "error": res["error"]}
    rows = parse_v1_rainfall(res["data"])
    if not rows:
        return {"ok": False, "status": 200, "data": None, "error": "rainfall-empty"}
    return {"ok": True, "status": 200, "data": rows, "error": None}


async def get_radar_info(station):
    """Radar animation GIF product for the city's local DWR station."""
    code = station["radar_code"]
    candidates = [
        f"{config.IMD_RADAR_BASE}/{code}/{_radar_name(code, 'Looping')}.gif",
        f"{config.IMD_RADAR_BASE}/{code}/{_radar_name(code, 'L')}.gif",
    ]
    for url in candidates:
        res = await fetch_text(url, timeout_ms=config.TIMEOUTS["radar"])
        if res["ok"]:
            return {"ok": True, "imageUrl": url, "live": True, "status": res["status"], "lookups": candidates}
    return {"ok": False, "imageUrl": None, "live": False, "status": 404, "lookups": candidates}


def _radar_name(code, prefix):
    """IMD radar file naming (e.g. DELHI_LoopingX-....gif)."""
    now = datetime.now(timezone.utc)
    return f"{code}_{prefix}{_radar_letter(now)}"


def _radar_letter(now):
    hour = now.hour
    if 5 <= hour < 11:
        return "m"
    if 11 <= hour < 17:
        return ""
    if 17 <= hour < 23:
        return "e"
    return "n"


async def get_satellite_info(image_url):
    res = await fetch_text(image_url, timeout_ms=config.TIMEOUTS["satellite"])
    return {"ok": res["ok"], "status": res["status"], "imageUrl": image_url if res["ok"] else None, "live": res["ok"]}
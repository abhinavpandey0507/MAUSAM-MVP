"""WEATHER AGGREGATION SERVICE
------------------------------
Fetches each weather slice (observation, forecast, nowcast, warnings, rainfall)
and merges it into a single JSON bundle the dashboard renders. Live sources are
labelled so DEMO/fallback data can never be mistaken for real IMD output.
"""
from datetime import datetime, timezone
import asyncio

from . import config, imd_client
from .cache import cache_remember
from .stations import get_station
from . import simulator


def init_obs_result(parsed: dict | None, station) -> dict:
    if parsed:
        return {"current": parsed, "currentSource": "imd-scrape", "currentOk": True}
    sim = simulator.simulate_current(station["id"])
    return {"current": sim, "currentSource": "simulated", "currentOk": False}


async def _probe_live_media():
    """Quick liveness probes so /api/status and the UI can show source status."""
    station = get_station("new-delhi")

    async def radar_probe():
        info = await imd_client.get_radar_info(station)
        return "ok" if info.get("live") else "down"

    async def sat_probe():
        c0 = "https://mausam.imd.gov.in/ImagesForState-SAT/"
        res = await imd_client.get_satellite_info(c0)
        return "ok" if res.get("live") else "down"

    radar, satellite = await asyncio.gather(radar_probe(), sat_probe(), return_exceptions=True)
    return {
        "radar": "ok" if radar == "ok" else "down",
        "satellite": "ok" if satellite == "ok" else "down",
    }


async def get_live_status(live_media=None):
    media = live_media or await _probe_live_media()
    return {
        "imdV1": "unused",  # key-less backend forces the v1 keyed API out.
        "observationScrape": "ok" if config.is_live_enabled() else "simulated",
        "radarProducts": media.get("radar", "down"),
        "satelliteImagery": media.get("satellite", "down"),
        "liveEnabled": config.is_live_enabled(),
    }


def _merge_weather(parts, station, demo: bool):
    """Merge the per-source slices + compute source metadata exactly like old backend."""
    current = parts["current"]
    fc = parts.get("forecast") or simulator.simulate_forecast(station["id"], 7)
    hourly = simulator.simulate_hourly(station["id"])
    nowcast = parts.get("nowcast") or simulator.simulate_nowcast(station["id"])
    warnings = parts.get("warnings") or simulator.simulate_warnings(station["id"])
    rainfall = parts.get("rainfall") or simulator.simulate_rainfall(station["id"])

    live_flags = {
        "observationScrape": parts.get("currentOk", False),
        "forecast": parts.get("forecastOk", False),
        "nowcast": parts.get("nowcastOk", False),
        "warnings": parts.get("warningsOk", False),
        "rainfall": parts.get("rainfallOk", False),
    }
    any_live = any(live_flags.values())
    if any_live:
        data_mode = "live" if all(live_flags.values()) else "mixed"
    else:
        data_mode = "fallback"

    data_source = "LIVE IMD" if data_mode == "live" else ("MIXED LIVE + SIM" if data_mode == "mixed" else "SIMULATED DATA")
    imd_unavailable = data_mode == "fallback"

    return {
        "location": current.get("location") or station["name"],
        "locationId": current.get("locationId") or station["id"],
        "lat": current.get("lat", station["lat"]),
        "lon": current.get("lon", station["lon"]),
        "temperature": current.get("temperature"),
        "feelsLike": current.get("feelsLike"),
        "unit": current.get("unit", "C"),
        "humidity": current.get("humidity"),
        "windSpeed": current.get("windSpeed"),
        "windDirection": current.get("windDirection"),
        "pressure": current.get("pressure"),
        "visibility": current.get("visibility"),
        "rainfall": current.get("rainfall"),
        "weatherCondition": current.get("weatherCondition"),
        "observedAt": current.get("observedAt"),
        "sunrise": current.get("sunrise"),
        "sunset": current.get("sunset"),
        "forecast": fc,
        "hourly": hourly,
        "warnings": warnings,
        "nowcast": nowcast,
        "rainfallData": rainfall,
        "source": "mixed" if any_live else "simulated",
        "dataSourceLabel": data_source,
        "imdUnavailable": imd_unavailable,
        "dataMode": data_mode,
        "anyLive": any_live,
        "demo": demo,
        "sources": {
            "observation": parts.get("currentSource", "simulated"),
            "forecast": parts.get("forecastSource", "simulated"),
            "nowcast": parts.get("nowcastSource", "simulated"),
            "warnings": parts.get("warningsSource", "simulated"),
            "rainfall": parts.get("rainfallSource", "simulated"),
        },
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    }


async def _fetch_live(station, demo: bool):
    async def obs():
        if demo or not config.is_live_enabled():
            return init_obs_result(None, station)
        res = await cache_remember(
            ["obs", station["id"]],
            lambda: imd_client.get_observation(station),
            config.CACHE_TTL["current"],
        )
        if res.get("ok"):
            return init_obs_result(res.get("data"), station)
        return init_obs_result(None, station)

    async def fc():
        if demo or not config.is_live_enabled():
            return {"data": None}
        return await cache_remember(
            ["forecast", station["id"]],
            lambda: imd_client.get_forecast(station),
            config.CACHE_TTL["forecast"],
        )

    async def nw():
        if demo or not config.is_live_enabled():
            return {"data": None}
        return await cache_remember(
            ["nowcast", station["id"]],
            lambda: imd_client.get_district_nowcast(station),
            config.CACHE_TTL["nowcast"],
        )

    async def wn():
        if demo or not config.is_live_enabled():
            return {"data": None}
        return await cache_remember(
            ["warnings", station["id"]],
            lambda: imd_client.get_district_warnings(station),
            config.CACHE_TTL["warnings"],
        )

    async def rf():
        if demo or not config.is_live_enabled():
            return {"data": None}
        return await cache_remember(
            ["rainfall", station["id"]],
            lambda: imd_client.get_district_rainfall(station),
            config.CACHE_TTL["warnings"],
        )

    results = await asyncio.gather(obs(), fc(), nw(), wn(), rf())
    obs_, fc_, nw_, wn_, rf_ = results
    return {
        "current": obs_["current"],
        "currentSource": obs_["currentSource"],
        "currentOk": obs_["currentOk"],
        "forecast": fc_.get("data"),
        "forecastSource": "imd-legacy" if fc_.get("data") else "simulated",
        "forecastOk": bool(fc_.get("data")),
        "nowcast": nw_.get("data"),
        "nowcastSource": "imd-legacy" if nw_.get("data") else "simulated",
        "nowcastOk": bool(nw_.get("data")),
        "warnings": wn_.get("data"),
        "warningsSource": "imd-legacy" if wn_.get("data") else "simulated",
        "warningsOk": bool(wn_.get("data")),
        "rainfall": rf_.get("data"),
        "rainfallSource": "imd-legacy" if rf_.get("data") else "simulated",
        "rainfallOk": bool(rf_.get("data")),
    }


async def get_weather(loc, opts=None):
    opts = opts or {}
    demo = bool(opts.get("demo"))
    station = get_station(loc)
    live = await _fetch_live(station, demo)
    data = _merge_weather(live, station, demo)
    return {"ok": True, "demo": demo, "location": station["id"], "data": data}
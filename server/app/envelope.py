"""Build the `WeatherEnvelope` shape (used by the existing React app) from the
local SQL dataset. Keeps the current UI fully functional while sourcing data
from SQL, and clearly separates live vs demonstration rows.
"""
from datetime import datetime, timezone

from . import config, repository as repo, simulator


def _meta_live_status(loc_id: str, has_live_obs: bool) -> dict:
    return {
        "imdV1": "unused",
        "observationScrape": "ok" if has_live_obs else "simulated",
        "radarProducts": "down",
        "satelliteImagery": "down",
        "liveEnabled": config.is_live_enabled(),
    }


def build_envelope(loc_id: str, demo: bool = False) -> dict | None:
    loc = repo.get_location(loc_id) or repo.get_location("new-delhi")
    if not loc:
        return None

    cur = repo.latest_observation(loc["id"])
    forecast = repo.forecast_rows(loc["id"])
    hourly = repo.hourly_rows(loc["id"])
    alerts = repo.alerts_for(loc["id"], active_only=True)

    has_live_obs = bool(cur and not cur["isDemo"])
    has_demo_obs = bool(cur and cur["isDemo"])
    any_demo_fc = any(f["isDemo"] for f in forecast)

    if has_live_obs and not any_demo_fc:
        data_mode = "live"
    elif has_live_obs or (not has_demo_obs and forecast):
        data_mode = "mixed"
    else:
        data_mode = "fallback"

    data_source_label = {
        "live": "LIVE (SQL dataset)",
        "mixed": "MIXED LIVE + SIMULATED (SQL dataset)",
        "fallback": "SIMULATED DEMO (SQL dataset)" if demo else "SIMULATED (SQL dataset)",
    }[data_mode]

    now = datetime.now(timezone.utc).isoformat()

    current = None
    if cur:
        current = {
            "temperature": cur["temperature"],
            "feelsLike": cur["feelsLike"],
            "humidity": cur["humidity"],
            "windSpeed": cur["windSpeed"],
            "windDirection": cur["windDirection"],
            "pressure": cur["pressure"],
            "visibility": cur["visibility"],
            "rainfall": cur["rainfall"],
            "weatherCondition": cur["weatherCondition"],
            "observedAt": cur["observedAt"],
            "stationName": cur["stationName"] or loc["name"],
            "source": "imd" if not cur["isDemo"] else "simulated",
            "sourceMeta": {
                "live": not cur["isDemo"],
                "via": cur["sourceLabel"],
                "provider": "India Meteorological Department" if not cur["isDemo"] else "MAUSAM simulator",
                "label": "LIVE" if not cur["isDemo"] else "SIMULATED",
            },
        }

    warnings = [
        {
            "severity": a["severity"],
            "event": a["event"],
            "area": a["area"],
            "detail": a["detail"],
            "validFrom": a["validFrom"],
            "validUntil": a["validUntil"],
            "source": "imd" if not a["isDemo"] else ("demo-simulation" if demo else "simulated"),
        }
        for a in alerts
    ]

    nowcast = simulator.simulate_nowcast(loc["id"])
    rainfall = simulator.simulate_rainfall(loc["id"])

    return {
        "location": loc["name"],
        "locationId": loc["id"],
        "lat": loc["lat"],
        "lon": loc["lon"],
        "unit": "C",
        "current": current,
        "hourly": hourly,
        "forecast": forecast,
        "warnings": warnings,
        "nowcast": nowcast,
        "rainfall": rainfall,
        "meta": {
            "dataMode": data_mode,
            "dataSourceLabel": data_source_label,
            "imdUnavailable": data_mode == "fallback",
            "lastUpdated": now,
            "sources": {
                "current": cur["sourceLabel"] if cur else "simulated",
                "forecast": forecast[0] and ("imd-legacy" if not forecast[0]["isDemo"] else "simulated") or "simulated",
                "warnings": "imd-legacy" if warnings and warnings[0]["source"] == "imd" else "simulated",
                "nowcast": "simulated",
                "rainfall": "simulated",
            },
            "liveStatus": _meta_live_status(loc["id"], has_live_obs),
        },
    }
"""RADAR + SATELLITE MEDIA SERVICE
---------------------------------
Radar and satellite products are public static gallery images (no key needed).
Availability is determined by a lightweight existence check; on failure the
caller uses a simulation flag so the dashboard still renders.
"""
from datetime import datetime, timezone

from . import config, imd_client
from .cache import cache_remember
from .stations import get_station


def _radar_gallery_name(code: str) -> str:
    """Common IMD gallery names: DELHI_LoopingX, DELHI_L, etc."""
    return f"{code}_LoopingX"


async def _resolve_radar(station, gallery: bool):
    res = await imd_client.get_radar_info(station)
    if res.get("ok"):
        return {
            "ok": True,
            "live": True,
            "imageUrl": res.get("imageUrl"),
            "lookups": res.get("lookups", []),
            "checkedAt": datetime.now(timezone.utc).isoformat(),
        }
    return {
        "ok": False,
        "live": False,
        "imageUrl": None,
        "lookups": res.get("lookups", []),
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }


async def radar_for(loc, demo: bool):
    station = get_station(loc)
    if demo or not config.is_live_enabled():
        return {
            "ok": True,
            "live": False,
            "location": station["id"],
            "data": {"simulated": True, "source": "demo"},
            "note": "Simulated radar product (DEMO mode) - no live DWR frame is shown.",
        }

    info = await cache_remember(["radar", station["id"]], lambda: _resolve_radar(station, True), config.CACHE_TTL["radar"])
    if info.get("live"):
        return {
            "ok": True,
            "live": True,
            "location": station["id"],
            "data": {
                "imageUrl": info.get("imageUrl"),
                "lookups": info.get("lookups"),
                "checkedAt": info.get("checkedAt"),
            },
            "note": "Live Doppler radar frame from IMD (public gallery).",
        }
    return {
        "ok": True,
        "live": False,
        "location": station["id"],
        "data": {"simulated": True, "source": "simulated", "error": "radar-unavailable"},
        "note": "Radar feed unavailable right now - showing simulation.",
    }


def _satellite_candidates():
    now = datetime.now(timezone.utc)
    slots = [now, now.replace(hour=12, minute=30, second=0), now.replace(hour=0, minute=0, second=0)]
    seen = []
    out = []
    for s in slots:
        code = s.strftime("%Y%m%d") + _sat_hour_code(s.hour)
        if code not in seen:
            seen.append(code)
            out.append(f"{config.SAT_BASE}/{code}_IR1-{code}.jpg")
    return out


def _sat_hour_code(hour: int) -> str:
    if 0 <= hour < 6:
        return "Z000"
    if 6 <= hour < 12:
        return "Z060"
    if 12 <= hour < 18:
        return "Z120"
    return "Z180"


async def _resolve_satellite(url: str):
    res = await imd_client.get_satellite_info(url)
    return {
        "ok": res.get("ok", False),
        "live": res.get("live", False),
        "imageUrl": res.get("imageUrl"),
        "status": res.get("status"),
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }


async def satellite_for(candidates, demo: bool):
    if demo or not config.is_live_enabled():
        return {
            "ok": True,
            "live": False,
            "data": {"simulated": True, "source": "demo"},
            "note": "Simulated satellite product (DEMO mode).",
        }
    for url in candidates or _satellite_candidates():
        info = await cache_remember(["sat", url], lambda u=url: _resolve_satellite(u), config.CACHE_TTL["satellite"])
        if info.get("live"):
            return {
                "ok": True,
                "live": True,
                "data": {"imageUrl": info.get("imageUrl"), "checkedAt": info.get("checkedAt"), "lookups": candidates or _satellite_candidates()},
                "note": "Live satellite imagery from IMD (public gallery).",
            }
    return {
        "ok": True,
        "live": False,
        "data": {"simulated": True, "source": "simulated", "error": "satellite-unavailable"},
        "note": "Satellite feed unavailable right now - showing simulation.",
    }
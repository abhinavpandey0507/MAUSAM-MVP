"""MAUSAM · FastAPI application
-------------------------------
- 100% key-less backend (no API keys anywhere).
- All responses go through SafeJSONResponse so NaN/Infinity never leak into the
  JSON wire format (the old Node server implicitly nulled NaN; we match that).
- Serves the built client (client/dist) when present with an SPA fallback.
"""
import math
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse

from . import config, cache, imd_client, media_service, weather_service, personalization, simulator
from .http_client import jsonable, init_client, close_client
from .stations import STATIONS, get_station


class SafeJSONResponse(JSONResponse):
    """Encoding that never emits NaN/Infinity (sanitizes before json.dumps)."""

    def render(self, content) -> bytes:
        try:
            encoded = super().render(content)  # uses json.dumps -> allow_nan may leak
            if b"NaN" in encoded or b"Infinity" in encoded:
                raise ValueError("non-finite float leaked into JSON")
            return encoded
        except Exception:
            return super().render(jsonable(content))


def _ok(payload, status=200) -> SafeJSONResponse:
    return SafeJSONResponse(jsonable(payload), status_code=status)


def _http_error(status, message):
    return _ok({"ok": False, "status": status, "error": message}, status)


def _client_dist() -> str:
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.normpath(os.path.join(here, "..", "..", "client", "dist"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_client()
    yield
    await close_client()


app = FastAPI(title="MAUSAM API", version="1.0.0", docs_url="/api/docs", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api")
async def api_index():
    return _ok(
        {
            "ok": True,
            "service": "MAUSAM SIH26076",
            "team": "THE_UNSCRIPTED",
            "version": "1.0.0 (key-less python backend)",
            "endpoints": {
                "weather": "/api/weather?location=new-delhi&demo=true",
                "radar": "/api/radar?location=new-delhi",
                "satellite": "/api/satellite",
                "locations": "/api/locations",
                "status": "/api/status",
                "alerts": "/api/alerts?location=new-delhi",
                "forecast": "/api/forecast?location=new-delhi",
                "nowcast": "/api/nowcast?location=new-delhi",
                "personas": "/api/personas",
                "personalize": "/api/personalize?location=new-delhi&persona=commuter&requirements=commute,ummbrella",
            },
        }
    )


@app.get("/api/health")
async def health():
    return _ok({"ok": True, "status": "healthy", "service": "MAUSAM SIH26076", "time": datetime.now(timezone.utc).isoformat()})


@app.get("/api/status")
async def status():
    media = await cache.cache_remember(
        ["status-media"],
        weather_service._probe_live_media,
        60,
    )
    live = await weather_service.get_live_status(media)
    return _ok(
        {
            "ok": True,
            "service": "MAUSAM SIH26076",
            "team": "THE_UNSCRIPTED",
            "live": live,
            "cache": dict(cache.cache_stats),
            "time": datetime.now(timezone.utc).isoformat(),
        }
    )


@app.get("/api/locations")
async def locations():
    return _ok({"ok": True, "data": [{"id": s["id"], "name": s["name"], "state": s["state"], "lat": s["lat"], "lon": s["lon"]} for s in STATIONS]})


@app.get("/api/personas")
async def personas():
    return _ok({"ok": True, "data": personalization.PERSONAS})


def _req_location(q: Request) -> str:
    return str(q.query_params.get("location") or "new-delhi")


@app.get("/api/weather")
async def weather(q: Request):
    loc = _req_location(q)
    demo = str(q.query_params.get("demo", "")).lower() in ("true", "1", "yes")
    if demo or not config.is_live_enabled():
        station = get_station(loc)
        data = simulator.simulate_weather_bundle(station["id"], mode="demo" if demo else "fallback")
        return _ok({"ok": True, "demo": bool(demo), "location": station["id"], "data": data})
    result = await weather_service.get_weather(loc, opts={"demo": False})
    if not result["ok"]:
        return _http_error(502, "weather aggregation failed")
    return _ok(result)


@app.get("/api/alerts")
async def alerts(q: Request):
    loc = _req_location(q)
    demo = str(q.query_params.get("demo", "")).lower() in ("true", "1", "yes")
    w = await weather_service.get_weather(loc, opts={"demo": demo})
    data = w["data"]
    warnings = data.get("warnings") or []
    top = personalization.top_warning(warnings)
    return _ok(
        {
            "ok": True,
            "demo": demo,
            "location": w["location"],
            "data": {
                "warnings": warnings,
                "topWarning": top,
                "nowcast": data.get("nowcast") or [],
                "source": data.get("dataSourceLabel", "SIMULATED DATA"),
                "meta": {
                    "dataMode": data.get("dataMode", "fallback"),
                    "lastUpdated": data.get("lastUpdated") or datetime.now(timezone.utc).isoformat(),
                },
            },
        }
    )


@app.get("/api/forecast")
async def forecast(q: Request):
    loc = _req_location(q)
    demo = str(q.query_params.get("demo", "")).lower() in ("true", "1", "yes")
    w = await weather_service.get_weather(loc, opts={"demo": demo})
    return _ok({"ok": True, "demo": demo, "location": w["location"], "data": w["data"].get("forecast") or []})


@app.get("/api/nowcast")
async def nowcast(q: Request):
    loc = _req_location(q)
    demo = str(q.query_params.get("demo", "")).lower() in ("true", "1", "yes")
    w = await weather_service.get_weather(loc, opts={"demo": demo})
    return _ok({"ok": True, "demo": demo, "location": w["location"], "data": w["data"].get("nowcast") or []})


@app.get("/api/radar")
async def radar(q: Request):
    loc = _req_location(q)
    demo = str(q.query_params.get("demo", "")).lower() in ("true", "1", "yes")
    return _ok(await media_service.radar_for(loc, demo))


@app.get("/api/satellite")
async def satellite(q: Request):
    demo = str(q.query_params.get("demo", "")).lower() in ("true", "1", "yes")
    return _ok(await media_service.satellite_for(None, demo))


def _parse_personalize(q: Request, body=None):
    g = q.query_params
    severe = str(g.get("severeSim", "")).lower() in ("true", "1", "yes")
    persona = str(g.get("persona") or "default")
    requirements = [r.strip() for r in str(g.get("requirements") or "").split(",") if r.strip()]
    if body:
        persona = str(body.get("persona") or persona)
        requirements = requirements or [r.strip() for r in str(body.get("requirements") or "").split(",") if r.strip()]
        if body.get("severeSim") in (True, "true", 1, "1"):
            severe = True
    return {
        "location": str(g.get("location") or "new-delhi"),
        "demo": str(g.get("demo", "")).lower() in ("true", "1", "yes") or bool(body and body.get("demo") in (True, "true", 1, "1")),
        "persona": persona,
        "severeSim": severe,
        "requirements": requirements,
        "personas": str(g.get("personas", "")),
    }


async def _personalize(p: dict):
    w = await weather_service.get_weather(p["location"], opts={"demo": p["demo"]})
    data = w["data"]
    if p["severeSim"]:
        data = dict(data)
        data["warnings"] = [
            {
                "severity": "warning",
                "event": "Severe thunderstorm with heavy rain",
                "area": get_station(p["location"])["district"],
                "validFrom": datetime.now(timezone.utc).isoformat(),
                "validUntil": datetime.now(timezone.utc).isoformat(),
                "source": "simulated",
            }
        ]
    out = personalization.personalize(
        p["location"],
        data,
        p["persona"],
        p["requirements"],
        {"requirements": p["requirements"], "persona": p["persona"]},
    )
    return out


@app.get("/api/personalize")
async def personalize_get(q: Request):
    p = _parse_personalize(q)
    return _ok(await _personalize(p))


async def _personalize_post_body(request: Request):
    try:
        return await request.json()
    except Exception:
        return {}
@app.post("/api/personalize")
async def personalize_post(request: Request):
    body = await _personalize_post_body(request)
    p = _parse_personalize(request, body)
    return _ok(await _personalize(p))


# ---- SPA / static fallback (built client only) ----
_DIST = _client_dist()


def _index_path():
    return os.path.join(_DIST, "index.html")


@app.get("/{full_path:path}")
async def spa(full_path: str, request: Request):
    if full_path.startswith("api/"):
        return _http_error(404, "endpoint not found")
    candidate = os.path.normpath(os.path.join(_DIST, full_path))
    if os.path.isfile(candidate) and candidate.startswith(_DIST):
        return FileResponse(candidate)
    index = _index_path()
    if os.path.isfile(index) and index.startswith(_DIST):
        return FileResponse(index)
    return _http_error(404, "client build not found - run `npm run build` in client/")


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    return _http_error(500, f"internal: {type(exc).__name__}: {exc}")
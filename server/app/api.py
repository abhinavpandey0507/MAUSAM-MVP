"""SQL-backed REST API (mounted at /api).

Weather data is served ONLY from the local SQLite dataset (populated by
`ingest.py`). No third-party weather API is called here. Auth uses httpOnly
JWT cookies; user preferences are persisted in SQL.
"""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field

from . import ingest, personalization, repository as repo
from .security import (
    COOKIE_NAME,
    TOKEN_TTL_SECONDS,
    create_token,
    hash_password,
    require_auth,
    verify_password,
)

router = APIRouter(prefix="/api")

INTEREST_MAP = {
    "general": ("general", ["temperature", "rain", "forecast", "severe_weather"]),
    "agriculture": ("farmer", ["rain", "temperature", "humidity", "severe_weather"]),
    "aviation": ("aviation", ["visibility", "wind", "pressure", "severe_weather"]),
    "health": ("general", ["temperature", "rain", "severe_weather"]),
    "sports": ("runner", ["temperature", "rain", "wind"]),
    "travel": ("traveler", ["temperature", "rain", "forecast"]),
    "marine": ("beach", ["wind", "rain", "severe_weather"]),
    "disaster": ("general", ["severe_weather", "rain"]),
    "science": ("researcher", ["temperature", "humidity", "pressure"]),
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _loc_or_404(loc_id: str) -> dict:
    loc = repo.get_location(loc_id) or repo.get_location("new-delhi")
    if not loc:
        raise HTTPException(status_code=404, detail="location not found")
    return loc


def _weather_for_personalization(loc_id: str) -> dict:
    cur = repo.latest_observation(loc_id) or {}
    fc = repo.forecast_rows(loc_id)
    alerts = repo.alerts_for(loc_id, active_only=True)
    warnings = [
        {"severity": a["severity"], "event": a["event"], "area": a["area"]} for a in alerts
    ]
    return {
        "temperature": cur.get("temperature"),
        "feelsLike": cur.get("feelsLike"),
        "humidity": cur.get("humidity"),
        "windSpeed": cur.get("windSpeed"),
        "rainfall": cur.get("rainfall"),
        "weatherCondition": cur.get("weatherCondition"),
        "rainProb": fc[0].get("rainProb") if fc else 0,
        "warnings": warnings,
    }


# ------------------------------------------------------------------ locations
@router.get("/locations")
async def locations():
    return {"ok": True, "data": repo.list_locations()}


@router.get("/locations/search")
async def locations_search(q: str = "", limit: int = 20):
    if not q.strip():
        return {"ok": True, "data": repo.list_locations()[:limit], "query": q}
    return {"ok": True, "data": repo.search_locations(q, limit), "query": q}


# --------------------------------------------------------------------- weather
@router.get("/weather/current")
async def weather_current(location: str = "new-delhi"):
    loc = _loc_or_404(location)
    cur = repo.latest_observation(loc["id"])
    if not cur:
        return {"ok": True, "data": None, "location": loc, "meta": {"available": False, "reason": "no observations in dataset"}}
    return {"ok": True, "data": cur, "location": loc, "meta": {"available": True, "isDemo": cur["isDemo"], "source": cur["sourceLabel"]}}


@router.get("/weather/hourly")
async def weather_hourly(location: str = "new-delhi"):
    loc = _loc_or_404(location)
    rows = repo.hourly_rows(loc["id"])
    return {"ok": True, "data": rows, "location": loc, "meta": {"available": bool(rows), "isDemo": any(r["isDemo"] for r in rows)}}


@router.get("/weather/forecast")
async def weather_forecast(location: str = "new-delhi"):
    loc = _loc_or_404(location)
    rows = repo.forecast_rows(loc["id"])
    return {"ok": True, "data": rows, "location": loc, "meta": {"available": bool(rows), "isDemo": any(r["isDemo"] for r in rows)}}


@router.get("/weather/history")
async def weather_history(location: str = "new-delhi", start: str | None = None, end: str | None = None):
    loc = _loc_or_404(location)
    rows = repo.observation_history(loc["id"], start, end)
    return {"ok": True, "data": rows, "location": loc, "meta": {"available": bool(rows), "count": len(rows)}}


@router.get("/weather/aqi")
async def weather_aqi(location: str = "new-delhi", start: str | None = None, end: str | None = None):
    loc = _loc_or_404(location)
    latest = repo.aqi_latest(loc["id"])
    history = repo.aqi_history(loc["id"], start, end)
    available = latest is not None
    return {
        "ok": True,
        "data": {"latest": latest, "history": history},
        "location": loc,
        "meta": {
            "available": available,
            "isDemo": bool(latest and latest["isDemo"]),
            "source": latest["source"] if latest else None,
            "note": "AQI is a labelled simulated dataset only; no official key-less IMD AQI feed is available.",
        },
    }


@router.get("/weather/alerts")
async def weather_alerts(
    location: str = "new-delhi",
    severity: str | None = None,
    type: str | None = None,
    includeExpired: bool = False,
):
    loc = _loc_or_404(location)
    rows = repo.alerts_for(loc["id"], severity, type, active_only=not includeExpired)
    return {"ok": True, "data": rows, "location": loc, "meta": {"available": bool(rows), "count": len(rows)}}


# -------------------------------------------------------------------- dataset
@router.get("/dataset/info")
async def dataset_info():
    return {"ok": True, "data": repo.dataset_info()}


@router.post("/dataset/ingest")
async def dataset_ingest():
    result = await ingest.ingest_all(force=True)
    return {"ok": True, "data": result}


# ------------------------------------------------------------------ dashboard
@router.get("/dashboard")
async def dashboard(location: str = "new-delhi", persona: str | None = None, interests: str = ""):
    loc = _loc_or_404(location)
    cur = repo.latest_observation(loc["id"])
    forecast = repo.forecast_rows(loc["id"])
    hourly = repo.hourly_rows(loc["id"])
    alerts = repo.alerts_for(loc["id"], active_only=True)
    aqi = repo.aqi_latest(loc["id"])

    interest_list = [i.strip() for i in interests.split(",") if i.strip()] or ["general"]
    persona_id, requirements = INTEREST_MAP.get(interest_list[0], INTEREST_MAP["general"])
    if persona:
        persona_id = persona

    weather = _weather_for_personalization(loc["id"])
    rec = personalization.personalize(loc["id"], weather, persona_id, requirements)

    stale = False
    latest_at = cur["observedAt"] if cur else None
    if latest_at:
        try:
            age_h = (datetime.now(timezone.utc) - datetime.fromisoformat(latest_at.replace("Z", "+00:00"))).total_seconds() / 3600
            stale = age_h > 12
        except (ValueError, AttributeError):
            stale = False

    return {
        "ok": True,
        "location": loc,
        "current": cur,
        "forecast": forecast,
        "hourly": hourly,
        "alerts": alerts,
        "aqi": aqi,
        "recommendations": {
            "persona": persona_id,
            "interests": interest_list,
            "result": rec.get("result"),
            "note": rec.get("dataSource"),
        },
        "freshness": {
            "latestObservation": latest_at,
            "stale": stale,
            "forecastDays": len(forecast),
            "hasAqi": aqi is not None,
            "sourceMode": ingest.get_meta("source_mode", "simulated"),
            "lastIngest": ingest.get_meta("last_ingest_at"),
        },
    }


# ----------------------------------------------------------------------- auth
class RegisterBody(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=6)
    displayName: str | None = None


class LoginBody(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str


def _valid_email(email: str) -> bool:
    email = email.strip()
    return "@" in email and "." in email.split("@")[-1] and " " not in email


def _issue_session(response: Response, user: dict):
    token = create_token(user["id"], user["email"])
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=TOKEN_TTL_SECONDS,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return token


@router.post("/auth/register")
async def auth_register(response: Response, body: RegisterBody):
    email = body.email.lower().strip()
    if not _valid_email(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address")
    if repo.get_user_by_email(email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    try:
        pw_hash = hash_password(body.password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    uid = repo.create_user(email, pw_hash, body.displayName or "")
    user = repo.get_user_by_id(uid)
    repo.upsert_prefs(uid, {})
    token = _issue_session(response, user)
    return {"ok": True, "user": repo.user_to_api(user), "token": token}


@router.post("/auth/login")
async def auth_login(response: Response, body: LoginBody):
    user = repo.get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = _issue_session(response, user)
    return {"ok": True, "user": repo.user_to_api(user), "token": token}


@router.post("/auth/logout")
async def auth_logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/auth/me")
async def auth_me(payload: dict = Depends(require_auth)):
    user = repo.get_user_by_id(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="Session user no longer exists")
    return {"ok": True, "user": repo.user_to_api(user), "preferences": repo.prefs_to_api(repo.get_prefs(user["id"]))}


# ------------------------------------------------------------------ user data
@router.get("/user/profile")
async def get_profile(payload: dict = Depends(require_auth)):
    user = repo.get_user_by_id(int(payload["sub"]))
    return {"ok": True, "profile": repo.user_to_api(user)}


@router.put("/user/profile")
async def put_profile(body: dict = Body(default={}), payload: dict = Depends(require_auth)):
    uid = int(payload["sub"])
    display_name = body.get("displayName")
    if display_name is not None:
        from .db import execute

        execute("UPDATE users SET display_name=? WHERE id=?", (str(display_name)[:80], uid))
    return {"ok": True, "profile": repo.user_to_api(repo.get_user_by_id(uid))}


@router.get("/user/preferences")
async def get_preferences(payload: dict = Depends(require_auth)):
    return {"ok": True, "preferences": repo.prefs_to_api(repo.get_prefs(int(payload["sub"])))}


@router.put("/user/preferences")
async def put_preferences(body: dict = Body(default={}), payload: dict = Depends(require_auth)):
    prefs = repo.upsert_prefs(int(payload["sub"]), body)
    return {"ok": True, "preferences": prefs}


@router.get("/user/interests")
async def get_interests(payload: dict = Depends(require_auth)):
    prefs = repo.prefs_to_api(repo.get_prefs(int(payload["sub"])))
    return {"ok": True, "interests": prefs["interests"]}


@router.put("/user/interests")
async def put_interests(body: dict = Body(default={}), payload: dict = Depends(require_auth)):
    interests = body.get("interests") or []
    if not isinstance(interests, list):
        raise HTTPException(status_code=400, detail="interests must be a list")
    valid = [i for i in interests if i in INTEREST_MAP]
    prefs = repo.upsert_prefs(int(payload["sub"]), {"interests": valid})
    return {"ok": True, "interests": prefs["interests"]}
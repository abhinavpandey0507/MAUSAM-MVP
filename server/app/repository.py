"""Read helpers over the SQLite weather dataset.
Returns plain dicts matching the frontend TypeScript contracts.
"""
from .db import query, query_one, execute


def _d(row) -> dict:
    return dict(row) if row is not None else None


# ----------------------------------------------------------------- locations
def list_locations() -> list[dict]:
    rows = query("SELECT id,name,state,lat,lon FROM locations ORDER BY name")
    return [_d(r) for r in rows]


def get_location(loc_id: str) -> dict | None:
    return _d(query_one("SELECT * FROM locations WHERE id=?", (loc_id,)))


def search_locations(q: str, limit: int = 20) -> list[dict]:
    like = f"%{q.strip().lower()}%"
    rows = query(
        "SELECT id,name,state,lat,lon FROM locations "
        "WHERE lower(name) LIKE ? OR lower(state) LIKE ? OR lower(id) LIKE ? "
        "ORDER BY name LIMIT ?",
        (like, like, like, limit),
    )
    return [_d(r) for r in rows]


# -------------------------------------------------------------- observations
def latest_observation(loc_id: str) -> dict | None:
    row = query_one(
        "SELECT * FROM observations WHERE location_id=? ORDER BY observed_at DESC LIMIT 1",
        (loc_id,),
    )
    if not row:
        return None
    r = _d(row)
    return {
        "temperature": r["temperature"],
        "feelsLike": r["feels_like"],
        "humidity": r["humidity"],
        "windSpeed": r["wind_speed"],
        "windDirection": r["wind_direction"] or "",
        "pressure": r["pressure"],
        "visibility": r["visibility"],
        "rainfall": r["rainfall"],
        "weatherCondition": r["weather_condition"] or "",
        "observedAt": r["observed_at"],
        "stationName": r["station_name"] or "",
        "source": "imd" if not r["is_demo"] else "simulated",
        "isDemo": bool(r["is_demo"]),
        "sourceLabel": r["source"],
    }


def observation_history(loc_id: str, start: str | None = None, end: str | None = None, limit: int = 400) -> list[dict]:
    sql = "SELECT observed_at,temperature,feels_like,humidity,wind_speed,rainfall,is_demo FROM observations WHERE location_id=?"
    params: list = [loc_id]
    if start:
        sql += " AND observed_at >= ?"
        params.append(start)
    if end:
        sql += " AND observed_at <= ?"
        params.append(end)
    sql += " ORDER BY observed_at ASC LIMIT ?"
    params.append(limit)
    rows = query(sql, tuple(params))
    return [
        {
            "time": r["observed_at"],
            "temperature": r["temperature"],
            "feelsLike": r["feels_like"],
            "humidity": r["humidity"],
            "windSpeed": r["wind_speed"],
            "rainfall": r["rainfall"],
            "isDemo": bool(r["is_demo"]),
        }
        for r in rows
    ]


# ----------------------------------------------------------------- forecast
def forecast_rows(loc_id: str) -> list[dict]:
    rows = query("SELECT * FROM forecast WHERE location_id=? ORDER BY forecast_date ASC", (loc_id,))
    return [
        {
            "date": r["forecast_date"],
            "weekday": r["weekday"],
            "tMax": r["tmax"],
            "tMin": r["tmin"],
            "condition": r["condition"],
            "rainProb": r["rain_prob"],
            "rainfall": r["rainfall"],
            "humidity": r["humidity"],
            "windSpeed": r["wind_speed"],
            "isDemo": bool(r["is_demo"]),
        }
        for r in rows
    ]


def hourly_rows(loc_id: str) -> list[dict]:
    rows = query("SELECT * FROM hourly WHERE location_id=? ORDER BY ts ASC", (loc_id,))
    return [
        {
            "time": r["ts"],
            "label": r["label"],
            "temperature": r["temperature"],
            "rainProb": r["rain_prob"],
            "humidity": r["humidity"],
            "isDemo": bool(r["is_demo"]),
        }
        for r in rows
    ]


# ------------------------------------------------------------------- alerts
def alerts_for(loc_id: str, severity: str | None = None, type_: str | None = None, active_only: bool = False) -> list[dict]:
    sql = "SELECT * FROM alerts WHERE location_id=?"
    params: list = [loc_id]
    if severity:
        sql += " AND severity=?"
        params.append(severity)
    if type_:
        sql += " AND lower(event) LIKE ?"
        params.append(f"%{type_.lower()}%")
    if active_only:
        sql += " AND (valid_until IS NULL OR valid_until >= datetime('now'))"
    sql += " ORDER BY CASE severity WHEN 'warning' THEN 0 WHEN 'alert' THEN 1 WHEN 'watch' THEN 2 ELSE 3 END, valid_from DESC"
    rows = query(sql, tuple(params))
    return [
        {
            "id": r["id"],
            "severity": r["severity"],
            "event": r["event"] or "",
            "detail": r["description"] or "",
            "area": r["area"] or "",
            "validFrom": r["valid_from"],
            "validUntil": r["valid_until"],
            "instructions": r["instructions"] or "",
            "source": r["source"],
            "isDemo": bool(r["is_demo"]),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------- AQI
def aqi_latest(loc_id: str) -> dict | None:
    r = query_one("SELECT * FROM aqi WHERE location_id=? ORDER BY recorded_at DESC LIMIT 1", (loc_id,))
    return _aqi_dict(r) if r else None


def aqi_history(loc_id: str, start: str | None = None, end: str | None = None, limit: int = 120) -> list[dict]:
    sql = "SELECT * FROM aqi WHERE location_id=?"
    params: list = [loc_id]
    if start:
        sql += " AND recorded_at >= ?"
        params.append(start)
    if end:
        sql += " AND recorded_at <= ?"
        params.append(end)
    sql += " ORDER BY recorded_at ASC LIMIT ?"
    params.append(limit)
    return [_aqi_dict(r) for r in query(sql, tuple(params))]


def _aqi_dict(r) -> dict:
    return {
        "aqi": r["aqi"],
        "category": r["category"],
        "pm25": r["pm25"],
        "pm10": r["pm10"],
        "no2": r["no2"],
        "so2": r["so2"],
        "co": r["co"],
        "o3": r["o3"],
        "recordedAt": r["recorded_at"],
        "source": r["source"],
        "isDemo": bool(r["is_demo"]),
    }


# ------------------------------------------------------------- dataset meta
def dataset_info() -> dict:
    loc_count = query_one("SELECT COUNT(*) AS c FROM locations")["c"]
    obs = query_one("SELECT COUNT(*) AS c, MIN(observed_at) AS mn, MAX(observed_at) AS mx, SUM(is_demo) AS demo FROM observations")
    fc = query_one("SELECT COUNT(*) AS c, MIN(forecast_date) AS mn, MAX(forecast_date) AS mx FROM forecast")
    aqi = query_one("SELECT COUNT(*) AS c, MAX(recorded_at) AS mx, SUM(is_demo) AS demo FROM aqi")
    latest_obs = query_one("SELECT MAX(observed_at) AS mx, SUM(is_demo) AS demo FROM observations")
    meta = query("SELECT key, value FROM dataset_meta")
    import json

    meta_d = {}
    for m in meta:
        try:
            meta_d[m["key"]] = json.loads(m["value"])
        except (ValueError, TypeError):
            meta_d[m["key"]] = m["value"]

    any_demo = bool((obs["demo"] or 0) > 0)
    return {
        "locations": loc_count,
        "observations": {
            "count": obs["c"],
            "earliest": obs["mn"],
            "latest": obs["mx"],
            "demoRows": obs["demo"] or 0,
        },
        "forecast": {"count": fc["c"], "from": fc["mn"], "to": fc["mx"]},
        "aqi": {"count": aqi["c"], "latest": aqi["mx"], "demoRows": aqi["demo"] or 0},
        "latestObservation": latest_obs["mx"],
        "anyDemoData": any_demo,
        "meta": meta_d,
    }


# -------------------------------------------------------------------- users
def create_user(email: str, password_hash: str, display_name: str) -> int:
    from datetime import datetime, timezone

    return execute(
        "INSERT INTO users(email,password_hash,display_name,created_at) VALUES(?,?,?,?)",
        (email.lower().strip(), password_hash, display_name or email.split("@")[0],
         datetime.now(timezone.utc).isoformat()),
    )


def get_user_by_email(email: str) -> dict | None:
    return _d(query_one("SELECT * FROM users WHERE email=?", (email.lower().strip(),)))


def get_user_by_id(user_id: int) -> dict | None:
    return _d(query_one("SELECT * FROM users WHERE id=?", (user_id,)))


def get_prefs(user_id: int) -> dict | None:
    return _d(query_one("SELECT * FROM user_prefs WHERE user_id=?", (user_id,)))


def upsert_prefs(user_id: int, patch: dict) -> dict:
    import json
    from datetime import datetime, timezone

    current = get_prefs(user_id) or {}
    interests = patch.get("interests", json.loads(current.get("interests") or "[]") if current else [])
    vals = {
        "preferred_location": patch.get("preferredLocation", current.get("preferred_location") if current else "new-delhi"),
        "temp_unit": patch.get("tempUnit", current.get("temp_unit") if current else "C"),
        "language": patch.get("language", current.get("language") if current else "en"),
        "interests": json.dumps(interests),
        "notify_alerts": int(patch.get("notifyAlerts", current.get("notify_alerts", 1) if current else 1)),
        "notify_daily": int(patch.get("notifyDaily", current.get("notify_daily", 1) if current else 1)),
        "notify_insights": int(patch.get("notifyInsights", current.get("notify_insights", 1) if current else 1)),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    execute(
        "INSERT INTO user_prefs(user_id,preferred_location,temp_unit,language,interests,notify_alerts,notify_daily,notify_insights,updated_at) "
        "VALUES(?,?,?,?,?,?,?,?,?) "
        "ON CONFLICT(user_id) DO UPDATE SET preferred_location=excluded.preferred_location, temp_unit=excluded.temp_unit, "
        "language=excluded.language, interests=excluded.interests, notify_alerts=excluded.notify_alerts, "
        "notify_daily=excluded.notify_daily, notify_insights=excluded.notify_insights, updated_at=excluded.updated_at",
        (
            user_id, vals["preferred_location"], vals["temp_unit"], vals["language"], vals["interests"],
            vals["notify_alerts"], vals["notify_daily"], vals["notify_insights"], vals["updated_at"],
        ),
    )
    return prefs_to_api(get_prefs(user_id))


def prefs_to_api(p: dict) -> dict:
    import json

    if not p:
        return {
            "preferredLocation": "new-delhi", "tempUnit": "C", "language": "en",
            "interests": [], "notifyAlerts": True, "notifyDaily": True, "notifyInsights": True,
        }
    return {
        "preferredLocation": p.get("preferred_location") or "new-delhi",
        "tempUnit": p.get("temp_unit") or "C",
        "language": p.get("language") or "en",
        "interests": json.loads(p.get("interests") or "[]"),
        "notifyAlerts": bool(p.get("notify_alerts", 1)),
        "notifyDaily": bool(p.get("notify_daily", 1)),
        "notifyInsights": bool(p.get("notify_insights", 1)),
    }


def user_to_api(u: dict) -> dict:
    if not u:
        return None
    return {"id": u["id"], "email": u["email"], "displayName": u["display_name"], "createdAt": u["created_at"]}
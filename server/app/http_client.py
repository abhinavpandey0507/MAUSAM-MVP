"""Async HTTP helpers (httpx) + small coercion utilities matching the original
Node backend semantics so the API contract stays identical.
"""
import json
import math
import re

import httpx

_client: httpx.AsyncClient | None = None

HOME_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36 MAUSAM-SIH2026"
)


def init_client():
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(12.0),
            follow_redirects=True,
            headers={"User-Agent": HOME_UA, "Accept": "*/*"},
        )
    return _client


async def close_client():
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def fetch_text(url, timeout_ms: int = 8000, referer=None):
    try:
        client = _client if _client is not None else init_client()
        headers = {"Referer": referer} if referer else {}
        resp = await client.get(url, headers=headers, timeout=timeout_ms / 1000)
        return {"ok": resp.is_success, "status": resp.status_code, "text": resp.text, "headers": resp.headers}
    except httpx.TimeoutException:
        return {"ok": False, "status": 0, "text": "", "headers": None, "error": "timeout"}
    except Exception as err:  # noqa: BLE001 - never throw from the IMD client
        return {"ok": False, "status": 0, "text": "", "headers": None, "error": str(err)}


async def fetch_json(url, timeout_ms: int = 8000, referer=None):
    res = await fetch_text(url, timeout_ms=timeout_ms, referer=referer)
    if not res["ok"]:
        return {"ok": False, "status": res["status"], "data": None, "error": f"HTTP {res['status']}"}
    try:
        return {"ok": True, "status": res["status"], "data": json.loads(res["text"]), "error": None}
    except ValueError:
        return {"ok": False, "status": res["status"], "data": None, "error": "invalid-json"}


def pick(obj, keys):
    """First present non-empty value at any of the given keys (JS pick port)."""
    if not isinstance(obj, dict):
        return None
    for k in keys:
        v = obj.get(k)
        if v is not None and v != "":
            return v
    return None


def to_num(v):
    """JS Number() semantics: coerce a value to float, '' -> 0.0, garbage -> NaN."""
    if v is None:
        v = ""
    s = re.sub(r"[^0-9.\-]", "", str(v))
    if s == "":
        return 0.0
    try:
        n = float(s)
    except ValueError:
        return float("nan")
    return n if math.isfinite(n) else float("nan")


def find_value_near(html, label, max_dist: int = 40):
    idx = html.find(label)
    if idx < 0:
        return float("nan")
    window = html[idx : idx + max_dist]
    m = re.search(r"([-+]?\d{1,3}(?:\.\d+)?)", window)
    return float(m.group(1)) if m else float("nan")


def jsonable(obj):
    """Deep-convert NaN/Infinity to None so the JSON payload stays valid.
    (JSON.stringify in the old Node server collapsed NaN -> null; we match it.)"""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [jsonable(v) for v in obj]
    return obj
"""In-memory TTL cache with hit/miss tracking.
Cache keys are endpoint + parameters so repeated requests do not hammer IMD.
"""
import asyncio
import threading
import time

_store: dict[str, dict] = {}
_lock = threading.Lock()

cache_stats = {"hits": 0, "misses": 0, "sets": 0}


def cache_get(parts):
    key = "|".join(parts)
    with _lock:
        entry = _store.get(key)
        if not entry:
            cache_stats["misses"] += 1
            return {"hit": False, "value": None}
        if entry["expires_at"] < time.time():
            _store.pop(key, None)
            cache_stats["misses"] += 1
            return {"hit": False, "value": None}
        cache_stats["hits"] += 1
        return {"hit": True, "value": entry["value"]}


def cache_set(parts, value, ttl_seconds: int):
    key = "|".join(parts)
    with _lock:
        _store[key] = {"value": value, "expires_at": time.time() + ttl_seconds}
        cache_stats["sets"] += 1


async def cache_remember(parts, fn, ttl_seconds: int):
    res = cache_get(parts)
    if res["hit"]:
        return res["value"]
    fresh = fn()
    if asyncio.iscoroutine(fresh):
        fresh = await fresh
    ok = fresh is not None and fresh.get("ok") is not False
    if ok:
        cache_set(parts, fresh, ttl_seconds)
    return fresh


def cache_invalidate(pattern):
    with _lock:
        for key in list(_store.keys()):
            if pattern.search(key):
                _store.pop(key, None)


def cache_clear():
    with _lock:
        _store.clear()
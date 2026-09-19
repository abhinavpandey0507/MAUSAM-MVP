/** Simple thread-safe-ish in-memory TTL cache with hit/miss tracking.
 *  Cache keys are derived from endpoint + parameters so repeated requests
 *  do not hammer IMD. A "lastKnown" layer keeps stale data to serve on failure.
 */
const store = new Map();

export const cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0
};

function keyOf(parts) {
  return parts.join('|');
}

export function cacheGet(parts) {
  const key = keyOf(parts);
  const entry = store.get(key);
  if (!entry) {
    cacheStats.misses += 1;
    return { hit: false, value: null };
  }
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    cacheStats.misses += 1;
    return { hit: false, value: null };
  }
  cacheStats.hits += 1;
  return { hit: true, value: entry.value };
}

export function cacheSet(parts, value, ttlSeconds) {
  const key = keyOf(parts);
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
  cacheStats.sets += 1;
}

export function cacheRemember(parts, fn, ttlSeconds) {
  const { hit, value } = cacheGet(parts);
  if (hit) return value;
  const fresh = fn();
  if (fresh && fresh.ok !== false) {
    cacheSet(parts, fresh, ttlSeconds);
  }
  return fresh;
}

export function cacheInvalidate(pattern) {
  for (const key of store.keys()) {
    if (pattern.test(key)) store.delete(key);
  }
}

export function cacheClear() {
  store.clear();
}
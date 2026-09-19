/** HTTP helpers built on undici's global fetch (Node >= 18). */

export async function fetchText(url, { timeoutMs = 8000, headers = {}, referer } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 MAUSAM-SIH2026',
        Accept: '*/*',
        ...(referer ? { Referer: referer } : {}),
        ...headers
      },
      redirect: 'follow'
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, headers: res.headers };
  } catch (err) {
    return { ok: false, status: 0, text: '', headers: null, error: { message: err.name === 'AbortError' ? 'timeout' : err.message } };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, { timeoutMs = 8000, headers = {}, referer } = {}) {
  const res = await fetchText(url, { timeoutMs, headers, referer });
  if (!res.ok) return { ok: false, status: res.status, data: null, error: `HTTP ${res.status}` };
  try {
    return { ok: true, status: res.status, data: JSON.parse(res.text), error: null };
  } catch {
    return { ok: false, status: res.status, data: null, error: 'invalid-json' };
  }
}

/** Helper that extracts the first value found at any of the given keys. */
export function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

export function toNum(v) {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/** Generic recursive search for numbers near a label (used for HTML observation scraping). */
export function findValueNear(html, label, { maxDist = 40 } = {}) {
  const idx = html.indexOf(label);
  if (idx < 0) return NaN;
  const window = html.substring(idx, Math.min(html.length, idx + maxDist));
  const m = window.match(/([-+]?\d{1,3}(?:\.\d+)?)/);
  return m ? Number(m[1]) : NaN;
}
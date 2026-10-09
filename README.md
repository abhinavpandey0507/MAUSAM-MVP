# MAUSAM — Personalized Weather Intelligence

**Smart India Hackathon 2026 · Problem SIH26076 · Team THE_UNSCRIPTED**

A working LIVE MVP built around **one core idea: same weather, different needs, personalized
insights.** A 60-second onboarding captures who you are (14 roles, multi-select) and what
matters to you; a deterministic scoring engine then reorders the IMD *Mausam* homepage per
persona/requirements/location/time — using **real India Meteorological Department (IMD)**
data wherever it can be reached without an API key, and **clearly labelled
fallback/simulated data** everywhere else. No metric is ever fabricated as live.

> 🌐 **Live demo (GitHub Pages):** https://abhinavpandey0507.github.io/MAUSAM-MVP/

---

## 1. What it does (TL;DR)

| # | Feature | Status |
|---|---------|--------|
| 1 | 60-second onboarding wizard (6 screens: welcome → profile → roles → what matters → location → summary) | ✅ |
| 2 | Personalized homepage — AI-style insight on top, cards reordered by a scoring engine (14 roles, multi-persona weighted average) | ✅ LIVE |
| 3 | Critical warnings ALWAYS override personalization (priority-0 safety rule, incl. labelled demo warning) | ✅ |
| 4 | "Why?" explanations on the recommendation + every reordered card | ✅ |
| 5 | Live IMD observation scrape (New Delhi) | ✅ LIVE |
| 6 | Live IMD Doppler radar loops (7 cities) + INSAT-3D satellite | ✅ LIVE |
| 7 | IMD live sources — observation scrape, radar, satellite, legacy city/nowcast/warnings/rainfall APIs | ✅ 100% **key-less** (no API key anywhere) |
| 8 | Fallback deterministic simulator, always labelled | ✅ |
| 9 | Profile editing + Privacy & Data Control (edit / delete profile, notification & location controls) | ✅ |
| 10 | Persona switching recomputes the homepage instantly (no reload) | ✅ |
| 11 | Floating **MAUSAM AI** robot assistant — person-aware, data-grounded (never invents weather), quick questions, "Why this answer?" transparency, weather-reactive environment | ✅ |
| 12 | MAUSAM AI warning override — red 🚨 robot state surfaces official/demo severe warnings with "Explain Warning" / "View Official Alert" | ✅ |
| 13 | **Voice** assistant — mic (Speech Recognition) + spoken replies (TTS) with Indian locales (en-IN / hi-IN / pa-IN), graceful fallback where unsupported | ✅ |
| 14 | Official branding: Ministry of Earth Sciences · IMD header/footer + "Prototype for Smart India Hackathon 2026" (no false official claim) | ✅ |
| 15 | i18n — English / हिन्दी / ਪੰਜਾਬੀ for the **entire** UI *and* every MAUSAM AI answer (weather phrasing, dates, warnings, commute, comfort metrics) | ✅ |
| 16 | **Immersive weather environment** — animated sky backdrop (clouds / rain / fog / lightning / stars, day-night tint) that mirrors the live conditions behind every page | ✅ |
| 17 | One-time **AI intro card** ("Meet your weather AI") that greets the user by name, explains the anti-fabrication honesty rule, then never reappears | ✅ |
| 18 | **Local SQL dataset** — observations, forecasts, hourly, alerts, AQI and dataset metadata ingested into SQLite at startup; historical weather + AQI trend pages read directly from it | ✅ |
| 19 | **History** (past observations with charts), **Air Quality** (AQI gauge + trend), **Dataset** (coverage + re-ingest) and **About** pages | ✅ |
| 20 | **Accounts & protected routes** — register/sign-in, PBKDF2-SHA256 hashed passwords, HS256 JWT in an httpOnly cookie, SQL-backed preferences and interests; optional | ✅ |

---

## 2. Run it

> Repository: https://github.com/abhinavpandey0507/MAUSAM-MVP

> On Windows, `npm.ps1` is often blocked by the PowerShell execution policy —
> use **`npm.cmd`** instead of `npm`.

### Option 0 — Try it live (GitHub Pages)

**No setup needed:** https://abhinavpandey0507.github.io/MAUSAM-MVP/

> The static build runs fully client-side: personalization, MAUSAM AI, voice, the
> immersive environment and the demo simulator all work in the browser. Live IMD
> radar/satellite images load directly from `mausam.imd.gov.in`.
>
> For the full backend (server-side observation scrape + IMD district APIs), also deploy
> the Render blueprint:
>
> 1. Push this repo to GitHub (already done — see the link above).
> 2. Go to **render.com** → **New +** → **Blueprint** → connect the `MAUSAM-MVP` repo.
> 3. Render finds `render.yaml` automatically → click **Apply**.
> 4. Wait for the build (~3–4 min) → open your public URL
>    (`https://mausam-mvp.onrender.com` by default).

> The backend is **Fully Key-less Python (FastAPI)** — it never needs an IMD API key.
> Weather data flows **Frontend → MAUSAM backend → local SQLite dataset**. At startup the
> backend ingests IMD data into SQL when `ENABLE_LIVE_IMD=true` (best from India) and
> otherwise seeds the dataset from the labelled simulator (default). Live IMD scraping
> runs best from India; from overseas hosts it may be unreachable — the app then shows
> clearly-labelled simulated data, exactly as designed. The personalization, onboarding,
> MAUSAM AI, warning-override, accounts and chart demos work everywhere.

### Option A — Production (single server)

> Requires **Python 3.10+** and **Node 18+**.

```bash
# 1. Python backend deps (virtualenv recommended)
cd server
python -m venv .venv
.venv\Scripts\activate          # (Windows)  /  source .venv/bin/activate  (macOS/Linux)
pip install -r requirements.txt

# 2. Frontend deps + build
cd ..\client
npm.cmd install
npm.cmd run build               # outputs client/dist

# 3. Run the FastAPI server (serves the built app + /api on :4000)
cd ..\server
.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 4000
```

Open `http://localhost:4000`.

### Option B — Development (two processes, hot reload)

```bash
# Terminal 1 — backend API on :4000 (after `pip install -r server/requirements.txt`)
cd server
.venv\Scripts\python -m uvicorn app.main:app --reload

# Terminal 2 — frontend on :5173, proxies /api → :4000
cd client
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`.

---

## 3. Configuration

The backend reads environment variables (set them before starting uvicorn; there is no
`server/.env` file to avoid accidentally committing secrets):

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `4000` | Server port |
| `ENABLE_LIVE_IMD` | `false` | Hybrid mode. `true` additionally ingests the key-less IMD sources into SQL; `false` (default) seeds the dataset from the labelled simulator — no external calls |
| `MAUSAM_DB_PATH` | `server/data/mausam.db` | SQLite database file (created automatically) |
| `MAUSAM_JWT_SECRET` | `mausam-dev-secret-change-me` | Secret used to sign session JWTs — **set a strong value in production** |
| `MAUSAM_TOKEN_TTL` | `604800` (7 days) | Session cookie lifetime in seconds |
| `CLIENT_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,…` | CORS origins allowed to use credentialed requests |
| `IMD_V1_BASE` | `https://api.imd.gov.in/api/v1` | v1 API base (kept for status reporting; **no key is ever sent**) |
| `IMD_LEGACY_BASE` | `https://mausam.imd.gov.in/api` | IMD district / legacy endpoints |
| `IMD_CITY_BASE` | `https://city.imd.gov.in/api` | City weather endpoint |
| `IMD_RADAR_BASE` | `https://mausam.imd.gov.in/ImagesForState-DWR` | Radar gallery base |
| `IMD_SAT_BASE` | `https://mausam.imd.gov.in/ImagesForState-SAT` | Satellite gallery base |

There is **no API key**: observation scrape, district legacy APIs, radar and satellite use
public IMD URLs; anything that does not answer falls back to the labelled simulator.

---

## 4. Demo script (for the judges) — ~2 minutes

1. **Onboarding**: fresh profile → 60-second wizard (Welcome → About you → "What do you do?"
   14 roles multi-select → "What matters to you?" adaptive requirements → location →
   **YOUR MAUSAM PROFILE** summary) → **Open my MAUSAM**.
2. **Home** lands on the **personalized insight** at the top — a recommendation grounded in
   the data ("Good conditions for an early run · window 6:00–8:00 AM"), built from the chosen
   roles/requirements/location/time. Tap **"Why?"** to see the individual factors.
3. **CHANGE PERSONA → Runner** — instant reorder: *Outdoor Window, Temperature, UV, AQI,
   Wind, Rain*. Same weather data — different needs.
4. **CHANGE PERSONA → Farmer** — *Rainfall, Rain Timing, Field Work, Farm Insight* rise to
   the top. **→ Driver** — *Commute, Rain Risk, Visibility, Fog* dominate. Nothing reloads.
5. **Multi-persona mode** (Demo tab) — toggle Runner + Farmer together: the engine computes a
   **weighted average** and blends the widget order live.
6. **Severe demo** → a clearly-labelled **demo warning** jumps to **priority 0** above the
   recommendation, pushing personalization below the safety information.
7. **MAUSAM AI** (bottom-right robot, "Ask MAUSAM") → first tap shows a one-time **intro card**
   ("Meet your weather AI", greets you by name + honesty rule). Greeting answer uses real values
   ("Based on your Runner profile, today's morning conditions are currently more favorable…").
   Ask **"Why?"** → the assistant lists the profile/forecast basis. Switch persona → the
   assistant re-greets for the new persona. Quick questions adapt per persona
   (Runner → "Best time today?", Driver → "How is my commute?", etc.). The robot **reacts to the
   weather**: listening (green), speaking (talking mouth), thinking (radar scan), severe (red).
8. **Radar** → live IMD Doppler loops (SRI / MAXZ). **Satellite** → live INSAT-3D image.
9. On **Alerts** a green `NO WARNING` chip shows when no official warning exists.
10. **Severe demo** → MAUSAM AI switches to a red 🚨 robot state ("There's an active official weather
    warning…") with **Explain Warning** / **View Official Alert**, and the homepage shows the
    demo warning at priority-0 — safety always overrides personalization.
11. **Voice** (Settings → Voice Assistant) → speak a question in the app language; MAUSAM answers
    out loud (en-IN / hi-IN / pa-IN voices). Browsers without Speech APIs show a friendly hint.
12. **Honesty rule**: UV / AQI answers say *"I don't have that information from the current
    weather source."* Nothing invented is presented as live.
13. **Environment** — switch language to हिन्दी or ਪੰਜਾਬੀ: the whole UI *and* every AI answer
    switch, while the sky backdrop keeps mirroring the weather (rain ☔, clouds ☁, stars ✨…).

---

## 5. Where the data comes from (honesty map)

**MAUSAM AI is a grounded language layer, not a chatbot.** Its pipeline is exactly the
homepage's: `SQL dataset → normalized weather → personalization engine → context → answer`.
Every answer is built from the values already shown on-screen; where a value is absent it
says *"I don't have that information from the current weather source."* The answer layer is
deterministic for the MVP (no fabricated metrics), with an LLM-only-as-language-layer
seam left in place for a future optional LLM.

**All weather serves come from the SQL dataset** (`server/data/mausam.db`, created at
startup). The `/api/weather/*`, `/api/dashboard`, `/api/locations/search` and
`/api/dataset/*` endpoints are pure SQL reads — no third-party weather API is contacted at
request time. The **Dataset** page shows live row counts, coverage and the ingest mode.

**Ingestion (hybrid):** `ingest.py` fills the dataset once at startup (and on demand via
`POST /api/dataset/ingest`). With `ENABLE_LIVE_IMD=true` it first tries the key-less IMD
sources; everything else falls back to the deterministic simulator. Each row records
`is_demo` + `source` so provenance is auditable end-to-end.

**Accounts:** optional. Registered users get PBKDF2-SHA256-hashed passwords and an HS256
session JWT set as an **httpOnly cookie** (`mausam_session`); preferences/interests are
persisted in SQL. The token is also returned in the response body for same-page use, but
the client keeps it **in memory only** (never localStorage).

**LIVE — no key needed (this backend is fully key-less):**
- **Current observation** (New Delhi-Safdarjung and regional stations) — scraped from the
  `id="city_weather"` block of the IMD site (strict parse; invalid/implausible values rejected).
- **Radar** loops from the IMD radar **gallery (static)** under `ImagesForState-DWR`.
- **Satellite** frames from the IMD satellite **gallery (static)** under `ImagesForState-SAT`.
- **City forecast / district nowcast / district warnings / district rainfall** via IMD's
  public legacy `*_api.php` endpoints (no key — always strictly validated + labelled).

**DERIVED rules (not fabricated metrics):**
- Personalization reordering, insights, outdoor-window, field-work score, fog risk,
  rain risk, hourly temperature profile — all computed from the forecast above.

**FALLBACK / DEMO — always labelled `SIMULATED` / `DEMO FALLBACK DATA`:**
- Deterministic seasonal simulator (monthly climate normals per city + deterministic noise)
  used when no live source answers — including current weather for cities whose IMD
  page is unreachable, and any warning source that does not answer.
- Demo-mode severe warning (`source: 'demo-simulation'`).

**Never fabricated:** UV index, AQI, pressure, visibility etc. are shown as
**"Not available from current source"** rather than invented.

---

## 6. Layout

```
server/                         Python 3 (FastAPI) backend :4000  — 100% key-less
  requirements.txt              fastapi · uvicorn · httpx (no DB driver needed: stdlib sqlite3)
  app/
    main.py                     FastAPI app, SafeJSONResponse (NaN→null), static SPA fallback
    config.py                   env config (PORT, ENABLE_LIVE_IMD, DB path, JWT secret — no keys)
    cache.py                    in-memory TTL cache + /api/status stats
    stations.py                 7 cities (ids, coords, radar codes, obs names)
    http_client.py              async httpx client + JS-compatible helpers
    parsers.py                  tolerant IMD → normalized parsers
    imd_client.py               key-less live-source attempts (scrape → legacy APIs)
    media_service.py            radar + satellite (public gallery)
    simulator.py                labelled deterministic fallback (FNV-1a noise)
    personalization.py          server mirror of the rule tables
    db.py                       SQLite schema + connection (WAL), stdlib only
    ingest.py                   seeds locations + 30-day observations/AQI/forecast into SQL
    repository.py               typed SQL read/write helpers for the API and auth
    security.py                 PBKDF2-SHA256 password hashing + HS256 JWT (stdlib)
    api.py                      /api router: weather, history, AQI, dashboard, dataset, auth, user
    envelope.py                 SQL → legacy WeatherEnvelope shape used by the original pages

client/                         React 18 + Vite + Tailwind (TS)
  src/
    pages/                      Onboarding (6-step wizard), Home, Forecast, Nowcast, Alerts,
                                Radar, Satellite, Demo, Profile, Settings, Auth, History,
                                AirQuality, Dataset, About
    ai/mausamAi.ts              data-grounded answer engine (context → persona-aware answers,
                                fully localized en / hi / pa)
    components/                 TopBar (with browse menu), BottomNav, AppFooter, MausamAi
                                (floating robot assistant w/ voice), WeatherEnvironment,
                                ProtectedRoute, PersonalizedInsight, cards/*, LocationPicker,
                                PersonaPicker, Modal, WhyButton…
    services/voice.ts           Speech Recognition + TTS (en-IN / hi-IN / pa-IN)
    services/apiClient.ts       centralized fetch: base URL, credentials, timeout, ApiError
    services/api.ts             legacy endpoint wrappers + static-host simulator fallback
    services/sqlApi.ts          typed SQL-backed endpoints (weather/history/AQI/dataset/auth/user)
    context/AuthContext.tsx     session via httpOnly cookie + in-memory token, prefs sync
    weather/environmentEngine.ts day/night + condition → sky scene (clouds/rain/fog/storm/stars)
    data/                       personas.ts (14), requirements.ts (catalog + boosts), locations.ts
    personalization/            engine.ts (weights + scoring), recommendations.ts
    i18n/translations.ts        en / hi / pa (UI + every AI answer + robot copy)
    context/AppContext.tsx      state + localStorage + onboarding gate + demo severe + voice prefs
```

---

## 7. Notes & known limits

- The GitHub Pages static build runs without a backend: `client/src/services/api.ts`
  detects the static host and serves the labelled fallback simulator directly.
  Deploying `server/` activates the full SQL dataset, history/AQI charts, accounts and
  the configurable `VITE_API_BASE_URL` client.
- The source parsers are tolerant, best-effort — a scraping smudge is rejected instead of
  shown as live; if IMD changes a page the app degrades to labelled simulation. With
  `ENABLE_LIVE_IMD=false` (default) no external calls are made at all.
- **NaN safety:** the FastAPI layer serializes any `NaN`/`Infinity` as `null` so the JSON
  payload is always valid for the browser (`SafeJSONResponse` in `app/main.py`).
- **Auth across origins:** the session cookie works over same-origin (Vite proxy in dev /
  FastAPI serving the built client in prod) and via the Bearer token otherwise. Plain-HTTP
  cross-site cookie sending is blocked by browsers — use same-origin or HTTPS.
- All values from the simulator use per-city monthly climate normals and a seeded PRNG,
  so two runs of the same city/day/hour agree, but they are still *not* real observations.
- Guest data (name, phone, email, roles, requirements, notifications, saved locations) stays
  in `localStorage`; when you sign in, preferences/interests are stored in the local SQL
  database and can be deleted at any time. There are no external services storing data.
- The database file lives at `server/data/mausam.db` and is gitignored (it regenerates at
  startup); `server/data/`, `server/.venv/` and `__pycache__/` are never committed.
- Onboarding is shown until the profile is marked `onboarded`; features are reachable
  immediately after (no gaps to other pages first).

Built with ❤️ by Team THE_UNSCRIPTED · Smart India Hackathon 2026
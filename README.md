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
| 7 | IMD v1 JSON APIs (forecast / nowcast / warnings / rainfall) | 🔑 when `IMD_API_KEY` set |
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
> For the full backend (IMD v1 JSON APIs + server-side observation scrape), also deploy
> the Render blueprint:
>
> 1. Push this repo to GitHub (already done — see the link above).
> 2. Go to **render.com** → **New +** → **Blueprint** → connect the `MAUSAM-MVP` repo.
> 3. Render finds `render.yaml` automatically → click **Apply**.
> 4. Wait for the build (~3–4 min) → open your public URL
>    (`https://mausam-mvp.onrender.com` by default).

> Live IMD scraping runs best from India; from overseas hosts it may be unreachable —
> the app then shows clearly-labelled simulated data, exactly as designed. The
> personalization, onboarding, MAUSAM AI and warning-override demos work everywhere.

### Option A — Production (single server)

```bash
# 1. Backend deps
cd server
npm.cmd install

# 2. Frontend deps + build
cd ..\client
npm.cmd install
npm.cmd run build        # outputs client/dist

# 3. Run the server (it serves the built app + /api)
cd ..\server
npm.cmd start            # → http://localhost:4000
```

Open `http://localhost:4000`.

### Option B — Development (two processes, hot reload)

```bash
cd server
npm.cmd install
npm.cmd run dev          # API on :4000

# second terminal
cd client
npm.cmd install
npm.cmd run dev          # Vite on :5173, proxies /api → :4000
```

Open `http://localhost:5173`.

---

## 3. Configuration

Backend reads environment variables in `server/.env` (see `server/src/config.js`):

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `4000` | Server port |
| `ENABLE_LIVE_IMD` | `true` | Master switch for all live IMD attempts |
| `IMD_API_KEY` | *(empty)* | Bearer key for `api.imd.gov.in/api/v1` + legacy `city.imd.gov.in` APIs |
| `IMD_V1_BASE` | `https://api.imd.gov.in/api/v1` | v1 API base |
| `IMD_LEGACY_BASE` | `https://city.imd.gov.in/api` | Legacy API base |
| `IMD_CITY_BASE` | `https://city.imd.gov.in/citywx` | City weather endpoint |
| `IMD_SITE_BASE` | `https://mausam.imd.gov.in` | Site used for observation/radar/satellite |

Without a key the app still works: radar, satellite and the New Delhi observation are
live; everything else falls back to the labelled simulator.

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
homepage's: `IMD data → normalized weather → personalization engine → context → answer`.
Every answer is built from the values already shown on-screen; where a value is absent it
says *"I don't have that information from the current weather source."* The answer layer is
deterministic for the MVP (no fabricated metrics), with an LLM-only-as-language-layer
seam left in place for a future key.

**LIVE — no key needed:**
- Current observation for **New Delhi-Safdarjung** — scraped from the `id="city_weather"`
  block of `https://mausam.imd.gov.in/` (strict parse; invalid/implausible values rejected).
- **Radar** loops `https://mausam.imd.gov.in/Radar/animation/Converted/{CODE}_SRI.gif` /
  `..._MAXZ.gif` (DELHI, MPT, KOL, CNI, HYD, MLR; Chandigarh uses DELHI fallback).
- **Satellite** `https://mausam.imd.gov.in/Satellite/3Dasiasec_ir1.jpg` (INSAT-3D Asia IR-1).

**LIVE — only when `IMD_API_KEY` is set (v1 + legacy APIs otherwise return HTTP 401):**
- Current weather, city forecast, district nowcast, district warnings, district rainfall.

**DERIVED rules (not fabricated metrics):**
- Personalization reordering, insights, outdoor-window, field-work score, fog risk,
  rain risk, hourly temperature profile — all computed from the forecast above.

**FALLBACK / DEMO — always labelled `SIMULATED` / `DEMO FALLBACK DATA`:**
- Deterministic seasonal simulator (monthly climate normals per city + deterministic noise)
  used when no live source answers — including current weather for cities other than
  New Delhi unless a key is configured, and all warnings with no key.
- Demo-mode severe warning (`source: 'demo-simulation'`).

**Never fabricated:** UV index, AQI, pressure, visibility etc. are shown as
**"Not available from current source"** rather than invented.

---

## 6. Layout

```
server/                         Express (ESM) backend :4000
  src/
    index.js                    app entry, serves client/dist + SPA fallback
    config.js                   env config
    data/stations.js            7 cities (ids, coords, radar codes, obs names)
    cache/cache.js              in-memory TTL cache + ./api/status stats
    imd/client.js               live-source attempts (v1 → scrape → legacy)
    imd/parsers.js              tolerant IMD → normalized parsers
    services/weatherService.js  aggregation, provenance (LIVE/SIMULATED)
    services/mediaService.js    radar + satellite
    personalization/engine.js   server mirror of the rule tables
    demo/simulator.js           labelled deterministic fallback
    routes/                     /api/{weather,forecast,nowcast,alerts,radar,
                                satellite,locations,status,personalize,personas,health}

client/                         React 18 + Vite + Tailwind (TS)
  src/
    pages/                      Onboarding (6-step wizard), Home, Forecast, Nowcast,
                                Alerts, Radar, Satellite, Demo, Profile, Settings
    ai/mausamAi.ts              data-grounded answer engine (context → persona-aware answers,
                                fully localized en / hi / pa)
    components/                 TopBar, BottomNav, AppFooter, MausamAi (floating robot
                                assistant w/ voice), WeatherEnvironment (animated backdrop),
                                PersonalizedInsight, cards/*, LocationPicker,
                                PersonaPicker, Modal, WhyButton…
    services/voice.ts           Speech Recognition + TTS (en-IN / hi-IN / pa-IN)
    weather/environmentEngine.ts day/night + condition → sky scene (clouds/rain/fog/storm/stars)
    data/                       personas.ts (14), requirements.ts (catalog + boosts)
    personalization/            engine.ts (weights + scoring), recommendations.ts
    i18n/translations.ts        en / hi / pa (UI + every AI answer + robot copy)
    context/AppContext.tsx      state + localStorage + onboarding gate + demo severe + voice prefs
    services/api.ts             typed API client
```

---

## 7. Notes & known limits

- The GitHub Pages build runs without a backend: `client/src/services/api.ts` detects the
  static host and serves the labelled fallback simulator directly (radar/satellite remain
  live IMD images). Deploying `server/` adds the IMD v1 JSON APIs + observation scrape.
- IMD v1 API responses depend on an IP/domain whitelist + bearer key; without them the
  server returns **401**, which is detected and labelled, never shown raw.
- The homepage scrape is a tolerant best-effort parse — it may stop working if IMD
  changes the page structure; the app degrades to labelled simulation automatically.
- All values from the simulator use per-city monthly climate normals and a seeded PRNG,
  so two runs of the same city/day/hour agree, but they are still *not* real observations.
- Personal data (name, phone, email, roles, requirements, notifications, saved locations) is
  stored **only in `localStorage`** and never leaves the device; "Delete profile & data"
  clears it. API credentials never leave the server.
- Onboarding is shown until the profile is marked `onboarded`; features are reachable
  immediately after (no gaps to other pages first).

Built with ❤️ by Team THE_UNSCRIPTED · Smart India Hackathon 2026
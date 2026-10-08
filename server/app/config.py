# MAUSAM - personalized weather intelligence (SIH26076)
# Python (FastAPI) backend. 100% key-less: it never accepts an IMD API key.
# Live public IMD sources are tried (observation scrape, radar GIF, satellite
# JPG, legacy city APIs); everything else degrades to the labelled simulator.

import os


def _num(value, default: int) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


PORT = _num(os.getenv("PORT"), 4000)
# Set to "false" to force demo simulation for all endpoints (judging mode).
ENABLE_LIVE_IMD = os.getenv("ENABLE_LIVE_IMD", "true").lower() != "false"

# Public IMD web properties used without any API key.
IMD_V1_BASE = os.getenv("IMD_V1_BASE", "https://api.imd.gov.in/api/v1")
IMD_LEGACY_BASE = os.getenv("IMD_LEGACY_BASE", "https://mausam.imd.gov.in/api")
CITY_BASE = os.getenv("IMD_CITY_BASE", "https://city.imd.gov.in/api")
SITE_BASE = "https://mausam.imd.gov.in"
IMD_RADAR_BASE = os.getenv("IMD_RADAR_BASE", "https://mausam.imd.gov.in/ImagesForState-DWR")
SAT_BASE = os.getenv("IMD_SAT_BASE", "https://mausam.imd.gov.in/ImagesForState-SAT")

# Conservative timeouts so the UI never hangs on a dead upstream.
TIMEOUTS = {
    "current": 7,
    "forecast": 9,
    "nowcast": 8,
    "warnings": 8,
    "radar": 6,
    "satellite": 6,
}

CACHE_TTL = {
    "current": 180,
    "forecast": 900,
    "nowcast": 480,
    "warnings": 480,
    "radar": 300,
    "satellite": 300,
}


def is_live_enabled() -> bool:
    return ENABLE_LIVE_IMD
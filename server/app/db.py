"""SQLite database layer for MAUSAM.

The application's weather is served from this local SQL database. The database is
populated by `ingest.py` from either (a) the key-less IMD sources when
ENABLE_LIVE_IMD is on, or (b) the deterministic simulator (clearly flagged
`is_demo=1`). No third-party weather API is ever contacted here.
"""
import os
import sqlite3
import threading
from contextlib import contextmanager

_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
DATA_DIR = os.path.normpath(_DATA_DIR)
DB_PATH = os.getenv("MAUSAM_DB_PATH") or os.path.join(DATA_DIR, "mausam.db")

_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  station_id TEXT,
  forecast_id TEXT,
  radar_code TEXT,
  site_slug TEXT,
  district TEXT
);

CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  temperature REAL,
  feels_like REAL,
  humidity REAL,
  wind_speed REAL,
  wind_direction TEXT,
  pressure REAL,
  visibility REAL,
  rainfall REAL,
  weather_condition TEXT,
  station_name TEXT,
  source TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_obs_loc_time ON observations(location_id, observed_at);

CREATE TABLE IF NOT EXISTS forecast (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  weekday TEXT,
  tmin REAL,
  tmax REAL,
  condition TEXT,
  rain_prob REAL,
  rainfall REAL,
  humidity REAL,
  wind_speed REAL,
  source TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fc_loc_date ON forecast(location_id, forecast_date);

CREATE TABLE IF NOT EXISTS hourly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id TEXT NOT NULL,
  ts TEXT NOT NULL,
  label TEXT,
  temperature REAL,
  rain_prob REAL,
  humidity REAL,
  source TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hourly_loc_ts ON hourly(location_id, ts);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  event TEXT,
  description TEXT,
  area TEXT,
  valid_from TEXT,
  valid_until TEXT,
  instructions TEXT,
  source TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_loc ON alerts(location_id);

CREATE TABLE IF NOT EXISTS aqi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  aqi REAL,
  category TEXT,
  pm25 REAL,
  pm10 REAL,
  no2 REAL,
  so2 REAL,
  co REAL,
  o3 REAL,
  source TEXT NOT NULL,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_aqi_loc_time ON aqi(location_id, recorded_at);

CREATE TABLE IF NOT EXISTS dataset_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_prefs (
  user_id INTEGER PRIMARY KEY,
  preferred_location TEXT,
  temp_unit TEXT DEFAULT 'C',
  language TEXT DEFAULT 'en',
  interests TEXT DEFAULT '[]',
  notify_alerts INTEGER DEFAULT 1,
  notify_daily INTEGER DEFAULT 1,
  notify_insights INTEGER DEFAULT 1,
  updated_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
"""


def _connect() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    with _lock, _connect() as conn:
        conn.executescript(SCHEMA)
        conn.commit()


@contextmanager
def get_conn():
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def query(sql: str, params: tuple = ()) -> list[sqlite3.Row]:
    with _connect() as conn:
        cur = conn.execute(sql, params)
        return cur.fetchall()


def query_one(sql: str, params: tuple = ()):
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: tuple = ()) -> int:
    with _lock, _connect() as conn:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid


def executemany(sql: str, seq) -> None:
    with _lock, _connect() as conn:
        conn.executemany(sql, seq)
        conn.commit()


def row_to_dict(row) -> dict:
    return dict(row) if row is not None else None
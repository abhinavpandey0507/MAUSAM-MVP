"""Authentication primitives — implemented with the Python standard library only.

- Passwords are hashed with PBKDF2-HMAC-SHA256 (per-user random salt, many
  iterations). Plaintext passwords are never stored.
- Sessions use a signed HS256 JWT delivered as an httpOnly cookie (so the token
  is not readable by JavaScript) and also accepted as a Bearer token.
"""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import HTTPException, Request

JWT_SECRET = os.getenv("MAUSAM_JWT_SECRET") or os.getenv("JWT_SECRET") or "mausam-dev-secret-change-me"
COOKIE_NAME = "mausam_session"
TOKEN_TTL_SECONDS = int(os.getenv("MAUSAM_TOKEN_TTL", str(7 * 24 * 3600)))
PBKDF2_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    if not password or len(password) < 6:
        raise ValueError("password must be at least 6 characters")
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), int(iters))
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        return False


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(segment: str) -> bytes:
    pad = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + pad)


def _sign(signing_input: bytes) -> bytes:
    return hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()


def create_token(user_id: int, email: str, ttl: int = TOKEN_TTL_SECONDS) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {"sub": str(user_id), "email": email, "iat": now, "exp": now + ttl}
    seg = _b64url(json.dumps(header, separators=(",", ":")).encode()) + "." + _b64url(
        json.dumps(payload, separators=(",", ":")).encode()
    )
    return seg + "." + _b64url(_sign(seg.encode("ascii")))


def decode_token(token: str):
    try:
        h, p, s = token.split(".")
        if not hmac.compare_digest(_b64url(_sign(f"{h}.{p}".encode("ascii"))), s):
            return None
        payload = json.loads(_b64url_decode(p))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except (ValueError, KeyError, json.JSONDecodeError):
        return None


def _extract_token(request: Request):
    cookie = request.cookies.get(COOKIE_NAME)
    if cookie:
        return cookie
    header = request.headers.get("Authorization") or ""
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return None


def get_token_payload(request: Request):
    token = _extract_token(request)
    return decode_token(token) if token else None


def require_auth(request: Request) -> dict:
    payload = get_token_payload(request)
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return payload
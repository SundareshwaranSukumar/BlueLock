"""Live match stats from CricAPI or Highlightly (RapidAPI)."""

from __future__ import annotations

import logging
import os
from typing import Any

import requests

from config.match_config import (
    AWAY_SHORT,
    CRICAPI_TEAM_A,
    CRICAPI_TEAM_B,
    HOME_SHORT,
)

logger = logging.getLogger(__name__)

_UNSET: dict[str, Any] = {
    "live": False,
    "runs": 0,
    "wickets": 0,
    "overs": 0.0,
    "batting": HOME_SHORT,
    "bowling": AWAY_SHORT,
    "win_probability": "—",
    "source": "unavailable",
    "agent_reaction": "Awaiting live feed — set CRICAPI_KEY or RAPIDAPI_KEY.",
}


def fetch_live_match() -> dict[str, Any]:
    """Return normalized live score dict; never raises."""
    cric_key = os.getenv("CRICAPI_KEY", "").strip()
    rapid_key = os.getenv("RAPIDAPI_KEY", "").strip()

    if cric_key and cric_key != "your_cricapi_key_here":
        data = _fetch_cricapi(cric_key)
        if data:
            return data
    if rapid_key and rapid_key != "your_rapidapi_key_here":
        data = _fetch_highlightly(rapid_key)
        if data:
            return data

    return dict(_UNSET)


def _fetch_cricapi(api_key: str) -> dict[str, Any] | None:
    try:
        resp = requests.get(
            "https://api.cricapi.com/v1/currentMatches",
            params={"apikey": api_key, "offset": 0},
            timeout=8,
        )
        resp.raise_for_status()
        matches = resp.json().get("data", [])
        for m in matches:
            teams = m.get("teams") or []
            name = " ".join(teams).lower()
            if _teams_match(name):
                score = m.get("score") or []
                innings = score[0] if score else {}
                runs = int(innings.get("r", 0) or 0)
                wickets = int(innings.get("w", 0) or 0)
                overs = float(innings.get("o", 0) or 0)
                return {
                    "live": m.get("matchStarted", True),
                    "runs": runs,
                    "wickets": wickets,
                    "overs": overs,
                    "batting": HOME_SHORT,
                    "bowling": AWAY_SHORT,
                    "win_probability": _estimate_wp(runs, wickets, overs),
                    "source": "cricapi",
                    "agent_reaction": (
                        f"LIVE · {HOME_SHORT} {runs}/{wickets} ({overs} ov) · Ekana"
                    ),
                }
    except Exception:
        logger.exception("CricAPI fetch failed")
    return None


def _fetch_highlightly(rapid_key: str) -> dict[str, Any] | None:
    try:
        resp = requests.get(
            "https://highlightly.net/api/v1/cricket/matches",
            headers={
                "x-rapidapi-key": rapid_key,
                "x-rapidapi-host": "highlightly.net",
            },
            params={"limit": 20},
            timeout=8,
        )
        resp.raise_for_status()
        payload = resp.json()
        items = payload if isinstance(payload, list) else payload.get("data", [])
        for m in items:
            home = str(m.get("homeTeam", {}).get("name", "")).lower()
            away = str(m.get("awayTeam", {}).get("name", "")).lower()
            if _teams_match(f"{home} {away}"):
                score = m.get("score") or {}
                runs = int(score.get("runs", 0) or 0)
                wickets = int(score.get("wickets", 0) or 0)
                overs = float(score.get("overs", 0) or 0)
                return {
                    "live": True,
                    "runs": runs,
                    "wickets": wickets,
                    "overs": overs,
                    "batting": HOME_SHORT,
                    "bowling": AWAY_SHORT,
                    "win_probability": _estimate_wp(runs, wickets, overs),
                    "source": "highlightly",
                    "agent_reaction": (
                        f"LIVE · {HOME_SHORT} {runs}/{wickets} ({overs} ov) · Ekana"
                    ),
                }
    except Exception:
        logger.exception("Highlightly fetch failed")
    return None


def _teams_match(blob: str) -> bool:
    _ = (CRICAPI_TEAM_A, CRICAPI_TEAM_B)
    return ("lucknow" in blob or "lsg" in blob) and ("punjab" in blob or "pbks" in blob)


def _estimate_wp(runs: int, wickets: int, overs: float) -> str:
    balls_left = max(1, int((20 - overs) * 6))
    wp = min(95, max(5, 50 + runs * 0.35 - wickets * 4 - balls_left * 0.1))
    return f"{int(wp)}%"

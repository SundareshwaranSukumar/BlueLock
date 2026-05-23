"""Background telemetry loop and WebSocket broadcast."""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import UTC, datetime
from typing import Any

from fastapi import WebSocket

from config.app_state import (
    append_intel_log,
    update_stadium_state,
)
from config.gate_state import get_all_gates
from config.match_config import VENUE
from services.cricket_service import fetch_live_match
from services.google_traffic_service import fetch_venue_traffic

logger = logging.getLogger(__name__)

TICK_SECONDS = 3

_subscribers: set[WebSocket] = set()
_sim: dict[str, Any] = {
    "gate_occ": {"A": 42.0, "B": 58.0, "C": 31.0, "D": 71.0},
    "parking": {
        "P-N": {"capacity": 400, "filled": 280},
        "P-S": {"capacity": 350, "filled": 190},
        "P-E": {"capacity": 300, "filled": 120},
        "P-W": {"capacity": 420, "filled": 360},
    },
    "queue_depth": {"A": 12, "B": 28, "C": 8, "D": 35},
}


def register_ws(ws: WebSocket) -> None:
    _subscribers.add(ws)


def unregister_ws(ws: WebSocket) -> None:
    _subscribers.discard(ws)


async def run_traffic_loop() -> None:
    while True:
        try:
            packet = await asyncio.to_thread(_build_packet)
            update_stadium_state(
                {
                    "match": packet["match"],
                    "traffic": packet.get("traffic", {}),
                    "gates": packet["gates"],
                    "parking": packet["parking"],
                    "queues": packet["queues"],
                    "transit_feed": packet["transit_feed"],
                    "last_updated": datetime.now(UTC).isoformat(),
                }
            )
            await _broadcast(packet)
        except Exception:
            logger.exception("Traffic loop tick failed")
        await asyncio.sleep(TICK_SECONDS)


async def _broadcast(packet: dict[str, Any]) -> None:
    dead: list[WebSocket] = []
    for ws in list(_subscribers):
        try:
            await ws.send_json(packet)
        except Exception:
            dead.append(ws)
    for ws in dead:
        unregister_ws(ws)


def _build_packet() -> dict[str, Any]:
    match = fetch_live_match()
    traffic = fetch_venue_traffic()
    _advance_synthetic()
    gates = _gate_payload()
    parking = _parking_payload()
    queues = dict(_sim["queue_depth"])
    transit = _transit_feed(traffic)
    reaction = match.get("agent_reaction") or "Ekana ops nominal."
    append_intel_log(f"[{datetime.now(UTC).strftime('%H:%M:%S')}] {reaction}")

    wp = match.get("win_probability", "50%")
    return {
        "liveScore": int(match.get("runs", 0)),
        "wickets": int(match.get("wickets", 0)),
        "overs": float(match.get("overs", 0)),
        "winProbability": wp,
        "agentReactionText": reaction,
        "isWicket": False,
        "isBoundary": False,
        "batting": match.get("batting", "LSG"),
        "bowling": match.get("bowling", "PBKS"),
        "venue": VENUE,
        "matchLive": bool(match.get("live")),
        "matchSource": match.get("source", "unavailable"),
        "gates": gates,
        "parking": parking,
        "queues": queues,
        "transit_feed": transit,
        "match": match,
        "traffic": traffic,
    }


def _advance_synthetic() -> None:
    occ = _sim["gate_occ"]
    for gid in list(occ.keys()):
        occ[gid] = max(8.0, min(98.0, occ[gid] + (random.random() - 0.48) * 5))
    for lot in _sim["parking"].values():
        lot["filled"] = min(
            lot["capacity"],
            max(0, lot["filled"] + random.randint(-8, 12)),
        )
    for gid in _sim["queue_depth"]:
        _sim["queue_depth"][gid] = max(
            0, _sim["queue_depth"][gid] + random.randint(-3, 5)
        )


def _gate_payload() -> list[dict[str, Any]]:
    occ = _sim["gate_occ"]
    backend_gates = get_all_gates()
    out: list[dict[str, Any]] = []
    for letter in ("A", "B", "C", "D"):
        o = int(round(occ[letter]))
        status = "CRITICAL" if o >= 80 else "WARNING" if o >= 60 else "NORMAL"
        scans = int(40 + o * 1.4)
        out.append(
            {
                "gateId": letter,
                "occupancy": o,
                "flowRate": scans,
                "status": status,
                "scansPerMin": scans,
            }
        )
    _ = backend_gates  # operational load still used on booking path
    return out


def _parking_payload() -> dict[str, Any]:
    return {
        k: {
            "capacity": v["capacity"],
            "filled": v["filled"],
            "free": v["capacity"] - v["filled"],
            "pct": round(100 * v["filled"] / max(v["capacity"], 1)),
        }
        for k, v in _sim["parking"].items()
    }


def _transit_feed(traffic: dict[str, Any]) -> list[dict[str, str]]:
    level = traffic.get("congestion_level", "moderate")
    return [
        {"mode": "Metro", "line": "Red Line · Ekana", "status": level, "eta": "6 min"},
        {"mode": "Bus", "line": "BMTC 340", "status": "ok", "eta": "12 min"},
        {"mode": "Ride", "line": "Last-mile pool", "status": "busy", "eta": "4 min"},
    ]

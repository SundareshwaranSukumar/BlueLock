"""Thread-safe in-memory telemetry cache merged by the traffic worker."""

from __future__ import annotations

from threading import Lock
from typing import Any

_state_lock = Lock()

STADIUM_STATE: dict[str, Any] = {
    "match": {
        "home": "LSG",
        "away": "PBKS",
        "venue": "Ekana Cricket Stadium",
        "live": False,
        "runs": 0,
        "wickets": 0,
        "overs": 0.0,
        "batting": "LSG",
        "bowling": "PBKS",
        "win_probability": "50%",
        "source": "unavailable",
    },
    "traffic": {"congestion_level": "unknown", "source": "unavailable"},
    "gates": {},
    "parking": {},
    "queues": {},
    "transit_feed": [],
    "intel_log": [],
    "last_updated": None,
}


def update_stadium_state(patch: dict[str, Any]) -> None:
    with _state_lock:
        for key, value in patch.items():
            if (
                key in STADIUM_STATE
                and isinstance(STADIUM_STATE[key], dict)
                and isinstance(value, dict)
            ):
                STADIUM_STATE[key].update(value)
            else:
                STADIUM_STATE[key] = value


def get_stadium_snapshot() -> dict[str, Any]:
    with _state_lock:
        import copy

        return copy.deepcopy(STADIUM_STATE)


def append_intel_log(line: str, max_lines: int = 40) -> None:
    with _state_lock:
        logs: list[str] = STADIUM_STATE.setdefault("intel_log", [])
        logs.insert(0, line)
        del logs[max_lines:]

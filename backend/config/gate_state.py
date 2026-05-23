"""In-memory operational gate clusters (A–D UI mapping via frontend_adapter)."""

from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from typing import Any


@dataclass
class GateStatus:
    gate_id: str
    stand_vector: str
    capacity_limit: int
    current_load: int = 0
    bypass_active: bool = False
    last_instruction: str | None = None


STAND_GATE_MAP: dict[str, list[str]] = {
    "north": ["GATE-A"],
    "south": ["GATE-B"],
    "east": ["GATE-C"],
    "west": ["GATE-D"],
    "vip": ["GATE-C"],
}

DEFAULT_GATES: dict[str, GateStatus] = {
    gate_id: GateStatus(
        gate_id=gate_id,
        stand_vector=stand,
        capacity_limit=1200,
    )
    for stand, gates in STAND_GATE_MAP.items()
    for gate_id in gates
}

_bypass_log: list[dict[str, Any]] = []
_state_lock = Lock()
_gates: dict[str, GateStatus] = {
    gid: GateStatus(
        gate_id=g.gate_id,
        stand_vector=g.stand_vector,
        capacity_limit=g.capacity_limit,
        current_load=g.current_load,
        bypass_active=g.bypass_active,
        last_instruction=g.last_instruction,
    )
    for gid, g in DEFAULT_GATES.items()
}


def get_all_gates() -> dict[str, GateStatus]:
    with _state_lock:
        return {k: GateStatus(**vars(v)) for k, v in _gates.items()}


def get_gate(gate_id: str) -> GateStatus | None:
    with _state_lock:
        g = _gates.get(gate_id)
        return GateStatus(**vars(g)) if g else None


def increment_gate_load(gate_id: str, amount: int = 1) -> GateStatus | None:
    with _state_lock:
        gate = _gates.get(gate_id)
        if not gate:
            return None
        gate.current_load = min(gate.current_load + amount, gate.capacity_limit)
        return GateStatus(**vars(gate))


def apply_bypass(
    target_gate_id: str,
    instruction: str,
    boundary_override: int | None = None,
) -> GateStatus | None:
    with _state_lock:
        gate = _gates.get(target_gate_id)
        if not gate:
            return None
        gate.bypass_active = True
        gate.last_instruction = instruction
        if boundary_override is not None:
            gate.capacity_limit = boundary_override
        _bypass_log.append(
            {
                "gate_id": target_gate_id,
                "instruction": instruction,
                "boundary_override": boundary_override,
            }
        )
        return GateStatus(**vars(gate))


def get_bypass_log() -> list[dict[str, Any]]:
    with _state_lock:
        return list(_bypass_log)


def build_context_snapshot() -> str:
    gates = get_all_gates()
    lines = ["BlueLock Gate Status Snapshot (Ekana):"]
    for gid, g in sorted(gates.items()):
        lines.append(
            f"  {gid} [{g.stand_vector}] load={g.current_load}/{g.capacity_limit} "
            f"bypass={g.bypass_active}"
        )
    return "\n".join(lines)

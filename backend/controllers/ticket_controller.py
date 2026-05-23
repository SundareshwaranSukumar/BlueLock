"""Ticket allocation and dynamic gate assignment logic."""

from __future__ import annotations

import uuid

from config.database import STAND_GATE_MAP, get_all_gates, increment_gate_load
from models.schemas import TicketBooking, TicketBookingResponse


def _normalize_stand(stand_vector: str) -> str:
    return stand_vector.strip().lower()


def _select_least_loaded_gate(stand_vector: str) -> tuple[str, int, int]:
    """Pick the gate with lowest utilization ratio for the stand cluster."""
    gate_ids = STAND_GATE_MAP.get(stand_vector, STAND_GATE_MAP["north"])
    gates = get_all_gates()

    best_gate = gate_ids[0]
    best_ratio = float("inf")
    best_load = 0
    best_capacity = 1200

    for gid in gate_ids:
        gate = gates.get(gid)
        if not gate:
            continue
        ratio = gate.current_load / max(gate.capacity_limit, 1)
        if ratio < best_ratio:
            best_ratio = ratio
            best_gate = gid
            best_load = gate.current_load
            best_capacity = gate.capacity_limit

    return best_gate, best_load, best_capacity


def book_ticket(payload: TicketBooking) -> TicketBookingResponse:
    stand = _normalize_stand(payload.stand_vector)
    if stand not in STAND_GATE_MAP:
        stand = "north"

    gate_id, load_before, capacity = _select_least_loaded_gate(stand)
    updated = increment_gate_load(gate_id, payload.ticket_count)
    load_after = updated.current_load if updated else load_before + payload.ticket_count

    utilization = load_after / max(capacity, 1)
    estimated_queue = int(min(45, max(2, utilization * 30)))

    return TicketBookingResponse(
        booking_id=str(uuid.uuid4()),
        assigned_gate=gate_id,
        stand_vector=stand,
        estimated_queue_minutes=estimated_queue,
        gate_load_after=load_after,
        gate_capacity=capacity,
    )

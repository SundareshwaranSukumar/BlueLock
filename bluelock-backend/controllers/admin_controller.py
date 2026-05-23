"""Administrative bypass and logistical command execution."""

from __future__ import annotations

from config.database import apply_bypass, get_gate
from models.schemas import BypassCommand, BypassResponse


def execute_bypass_route(payload: BypassCommand) -> BypassResponse:
    gate = get_gate(payload.target_gate_id)
    if not gate:
        return BypassResponse(
            success=False,
            gate_id=payload.target_gate_id,
            bypass_active=False,
            capacity_limit=0,
            logged_instruction=f"Unknown gate: {payload.target_gate_id}",
        )

    updated = apply_bypass(
        target_gate_id=payload.target_gate_id,
        instruction=f"[{payload.director_id}] {payload.instruction}",
        boundary_override=payload.boundary_override,
    )

    if not updated:
        return BypassResponse(
            success=False,
            gate_id=payload.target_gate_id,
            bypass_active=False,
            capacity_limit=gate.capacity_limit,
            logged_instruction="Bypass application failed",
        )

    return BypassResponse(
        success=True,
        gate_id=updated.gate_id,
        bypass_active=updated.bypass_active,
        capacity_limit=updated.capacity_limit,
        logged_instruction=payload.instruction,
    )

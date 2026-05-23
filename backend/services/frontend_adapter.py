"""Map frontend gate/seat contracts to backend stadium operations."""

from __future__ import annotations

import json
import re

from config.database import get_all_gates
from controllers.admin_controller import execute_bypass_route
from controllers.ai_controller import stadium_assistant
from controllers.ticket_controller import book_ticket
from models.frontend_contracts import (
    Corridor,
    FlowStatus,
    FrontendAssistant,
    FrontendAssistantResponse,
    FrontendBookTicket,
    FrontendBookTicketResponse,
    FrontendBypass,
    FrontendBypassResponse,
    GateLetter,
    SuggestedAction,
)
from models.schemas import BypassCommand, ChatMessage, TicketBooking

# UI gates (Chinnaswamy concourse labels) ↔ backend operational gate clusters
UI_GATE_TO_STAND: dict[GateLetter, str] = {
    "A": "north",
    "B": "east",
    "C": "west",
    "D": "south",
}

UI_GATE_TO_PRIMARY_BACKEND: dict[GateLetter, str] = {
    "A": "N-A",
    "B": "E-A",
    "C": "W-A",
    "D": "S-A",
}

STAND_TO_UI_GATE: dict[str, GateLetter] = {
    "north": "A",
    "east": "B",
    "west": "C",
    "south": "D",
    "vip": "B",
}

CORRIDOR: dict[GateLetter, Corridor] = {
    "A": "North",
    "B": "East",
    "C": "West",
    "D": "South",
}

NEAREST_TRANSIT: dict[GateLetter, str] = {
    "A": "Namma Metro · Cubbon Park (350m)",
    "B": "BMTC Hub · MG Road (480m)",
    "C": "Namma Metro · Vidhana Soudha (620m)",
    "D": "Namma Metro · Trinity (210m)",
}

STAND_NAMES: dict[str, str] = {
    "R": "Raghavendra",
    "P": "Pavilion",
    "G": "Garden",
    "M": "Metro",
}

SEAT_PREFIX_TO_STAND: dict[str, str] = {
    "R": "north",
    "P": "east",
    "G": "west",
    "M": "south",
}

BACKEND_PREFIX_TO_UI: dict[str, GateLetter] = {
    "N": "A",
    "E": "B",
    "W": "C",
    "S": "D",
    "VIP": "B",
}

ASSISTANT_JSON_SUFFIX = """
Always end your reply with a single JSON line (no markdown fences):
{"suggestedAction":"REDIRECT"|"STAY"|"PROCEED","targetGate":"A"|"B"|"C"|"D"|null}
Gates: A=North/Raghavendra, B=East/Pavilion, C=West/Garden, D=South/Metro.
"""


def _seat_stand_vector(seat_id: str) -> str:
    key = (seat_id[0] if seat_id else "R").upper()
    return SEAT_PREFIX_TO_STAND.get(key, "north")


def _backend_gate_to_ui(gate_id: str, stand_vector: str) -> GateLetter:
    if gate_id.startswith("VIP"):
        return "B"
    prefix = gate_id.split("-", maxsplit=1)[0] if "-" in gate_id else gate_id[:1]
    if prefix in BACKEND_PREFIX_TO_UI:
        return BACKEND_PREFIX_TO_UI[prefix]
    return STAND_TO_UI_GATE.get(stand_vector, "A")


def _queue_to_metro_load(minutes: int) -> FlowStatus:
    if minutes <= 10:
        return "ok"
    if minutes <= 25:
        return "warn"
    return "crit"


def book_ticket_frontend(payload: FrontendBookTicket) -> FrontendBookTicketResponse:
    """Book a ticket using frontend payload shape; return frontend response."""
    stand = _seat_stand_vector(payload.seatId)
    booking = book_ticket(
        TicketBooking(
            attendee_name=payload.userName,
            match_id=f"APL-{payload.teamAllegiance}",
            stand_vector=stand,
            seat_section=payload.seatId,
            ticket_count=1,
        )
    )

    ui_gate = _backend_gate_to_ui(booking.assigned_gate, booking.stand_vector)
    corridor = CORRIDOR[ui_gate]
    stand_key = (payload.seatId[0] or "R").upper()
    stand_label = STAND_NAMES.get(stand_key, "General")

    return FrontendBookTicketResponse(
        ticketId=booking.booking_id,
        assignedGate=ui_gate,
        recommendedRoute=(
            f"Enter via {corridor} concourse → Gate {ui_gate} → {stand_label} Stand."
        ),
        nearestTransit=NEAREST_TRANSIT[ui_gate],
        entryCorridor=corridor,
        metroLoad=_queue_to_metro_load(booking.estimated_queue_minutes),
    )


def bypass_route_frontend(payload: FrontendBypass) -> FrontendBypassResponse:
    """Execute director bypass from frontend payload shape."""
    target_backend = UI_GATE_TO_PRIMARY_BACKEND[payload.targetDiversionGateId]
    command = BypassCommand(
        director_id="DIRECTOR-PANEL",
        target_gate_id=target_backend,
        instruction=(
            f"[congested={payload.congestedGateId} → "
            f"divert={payload.targetDiversionGateId}] {payload.staffDirectiveText}"
        ),
    )
    result = execute_bypass_route(command)
    gates = get_all_gates()
    total_load = sum(g.current_load for g in gates.values())
    notified = (800 + (total_load // 2)) if result.success else 0

    return FrontendBypassResponse(
        status="DISPATCHED",
        clientsNotifiedCount=notified,
    )


def _extract_assistant_meta(
    text: str,
) -> tuple[str, SuggestedAction, GateLetter | None]:
    match = re.search(r"\{[\s\S]*\}\s*$", text)
    action: SuggestedAction = "PROCEED"
    target: GateLetter | None = None
    reply = text.strip()
    if match:
        try:
            meta = json.loads(match.group(0))
            raw_action = meta.get("suggestedAction")
            if raw_action in ("REDIRECT", "STAY", "PROCEED"):
                action = raw_action
            tg = meta.get("targetGate")
            if tg in ("A", "B", "C", "D"):
                target = tg
            reply = text[: match.start()].strip() or reply
        except json.JSONDecodeError:
            pass
    return reply, action, target


def stadium_assistant_frontend(
    payload: FrontendAssistant,
) -> FrontendAssistantResponse:
    """Run stadium assistant using frontend payload shape."""
    context_bits = [
        f"userId={payload.userId}",
        f"currentGate={payload.currentGate or 'unknown'}",
        f"location={payload.userLocationContext or 'unknown'}",
        ASSISTANT_JSON_SUFFIX,
    ]
    chat = stadium_assistant(
        ChatMessage(
            user_message=payload.message,
            context="\n".join(context_bits),
            session_id=payload.userId,
        )
    )
    reply, action, target = _extract_assistant_meta(chat.reply)
    return FrontendAssistantResponse(
        replyText=reply or chat.reply,
        suggestedAction=action,
        targetGate=target,
    )

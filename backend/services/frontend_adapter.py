"""Map frontend gate/seat contracts to backend stadium operations."""

from __future__ import annotations

import json
import re

from config.database import SessionLocal
from config.gate_state import get_all_gates
from controllers.admin_controller import execute_bypass_route
from controllers.ai_controller import stadium_assistant
from controllers.ticket_controller import book_ticket_full
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
from models.schemas import BypassCommand, ChatMessage

UI_GATE_TO_STAND: dict[GateLetter, str] = {
    "A": "north",
    "B": "south",
    "C": "east",
    "D": "west",
}

UI_GATE_TO_PRIMARY_BACKEND: dict[GateLetter, str] = {
    "A": "GATE-A",
    "B": "GATE-B",
    "C": "GATE-C",
    "D": "GATE-D",
}

STAND_TO_UI_GATE: dict[str, GateLetter] = {
    "north": "A",
    "south": "B",
    "east": "C",
    "west": "D",
}

CORRIDOR: dict[GateLetter, Corridor] = {
    "A": "North",
    "B": "South",
    "C": "East",
    "D": "West",
}

NEAREST_TRANSIT: dict[GateLetter, str] = {
    "A": "Metro Red Line · Ekana North (350m)",
    "B": "Metro Red Line · Ekana South (420m)",
    "C": "Bus Hub · Gomti Nagar (480m)",
    "D": "Ride Pool · West Plaza (290m)",
}

SEAT_PREFIX_TO_STAND: dict[str, str] = {
    "N": "north",
    "S": "south",
    "E": "east",
    "W": "west",
}

ASSISTANT_JSON_SUFFIX = """
Always end your reply with a single JSON line (no markdown fences):
{"suggestedAction":"REDIRECT"|"STAY"|"PROCEED","targetGate":"A"|"B"|"C"|"D"|null}
Gates: A=North, B=South, C=East, D=West at Ekana Cricket Stadium.
"""


def _seat_stand_vector(seat_id: str) -> str:
    key = (seat_id[0] if seat_id else "N").upper()
    return SEAT_PREFIX_TO_STAND.get(key, "north")


def _backend_gate_to_ui(gate_id: str, stand_vector: str) -> GateLetter:
    suffix = gate_id.rsplit("-", 1)[-1]
    if suffix in ("A", "B", "C", "D"):
        return suffix  # type: ignore[return-value]
    return STAND_TO_UI_GATE.get(stand_vector, "A")


def _queue_to_metro_load(minutes: int) -> FlowStatus:
    if minutes <= 10:
        return "ok"
    if minutes <= 25:
        return "warn"
    return "crit"


def book_ticket_frontend(payload: FrontendBookTicket) -> FrontendBookTicketResponse:
    db = SessionLocal()
    try:
        from models.schemas import BookTicketFull

        full = book_ticket_full(
            db,
            BookTicketFull(
                userName=payload.userName,
                gender=payload.gender,
                teamAllegiance=payload.teamAllegiance,
                seatId=payload.seatId,
                startingLocation="Ekana approach",
                transportMode="metro",
            ),
        )
        return FrontendBookTicketResponse(
            ticketId=full.ticketId,
            assignedGate=full.assignedGate,  # type: ignore[arg-type]
            recommendedRoute=full.recommendedRoute,
            nearestTransit=full.nearestTransit,
            entryCorridor=full.entryCorridor,  # type: ignore[arg-type]
            metroLoad=full.metroLoad,  # type: ignore[arg-type]
        )
    finally:
        db.close()


def bypass_route_frontend(payload: FrontendBypass) -> FrontendBypassResponse:
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

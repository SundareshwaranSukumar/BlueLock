"""REST API v1 endpoint declarations."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from controllers.admin_controller import execute_bypass_route
from controllers.ai_controller import stadium_assistant
from controllers.ticket_controller import book_ticket
from models.schemas import (
    BypassCommand,
    BypassResponse,
    ChatMessage,
    ChatResponse,
    TicketBooking,
    TicketBookingResponse,
)
router = APIRouter(prefix="/api/v1", tags=["v1"])


@router.post("/tickets/book", response_model=TicketBookingResponse)
async def post_book_ticket(payload: TicketBooking) -> TicketBookingResponse:
    return book_ticket(payload)


@router.post("/ai/stadium-assistant", response_model=ChatResponse)
async def post_stadium_assistant(payload: ChatMessage) -> ChatResponse:
    try:
        return stadium_assistant(payload)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Stadium assistant unavailable",
        ) from exc


@router.post("/admin/bypass-route", response_model=BypassResponse)
async def post_bypass_route(payload: BypassCommand) -> BypassResponse:
    return execute_bypass_route(payload)


# WebSocket pipeline placeholder — extend for live gate telemetry push
@router.get("/health")
async def v1_health() -> dict[str, str]:
    return {"status": "ok", "pipeline": "rest+websocket-ready"}

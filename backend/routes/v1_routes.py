"""REST API v1 endpoint declarations."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from controllers.admin_controller import execute_bypass_route
from controllers.ai_controller import stadium_assistant
from controllers.ticket_controller import book_ticket
from models.frontend_contracts import (
    FrontendAssistant,
    FrontendAssistantResponse,
    FrontendBookTicket,
    FrontendBookTicketResponse,
    FrontendBypass,
    FrontendBypassResponse,
)
from models.schemas import (
    BypassCommand,
    BypassResponse,
    ChatMessage,
    ChatResponse,
    TicketBooking,
    TicketBookingResponse,
)
from routes.request_utils import read_json_object, validate_model
from services.frontend_adapter import (
    book_ticket_frontend,
    bypass_route_frontend,
    stadium_assistant_frontend,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["v1"])


def _is_frontend_ticket(body: dict[str, Any]) -> bool:
    return "seatId" in body and "userName" in body


def _is_frontend_bypass(body: dict[str, Any]) -> bool:
    return "congestedGateId" in body and "targetDiversionGateId" in body


def _is_frontend_assistant(body: dict[str, Any]) -> bool:
    return "message" in body and "userId" in body


@router.post("/tickets/book")
async def post_book_ticket(
    request: Request,
) -> TicketBookingResponse | FrontendBookTicketResponse:
    body = await read_json_object(request)
    if _is_frontend_ticket(body):
        return book_ticket_frontend(validate_model(FrontendBookTicket, body))
    return book_ticket(validate_model(TicketBooking, body))


@router.post("/ai/stadium-assistant")
async def post_stadium_assistant(
    request: Request,
) -> ChatResponse | FrontendAssistantResponse:
    body = await read_json_object(request)
    try:
        if _is_frontend_assistant(body):
            return stadium_assistant_frontend(validate_model(FrontendAssistant, body))
        return stadium_assistant(validate_model(ChatMessage, body))
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Stadium assistant failed")
        raise HTTPException(
            status_code=502,
            detail="Stadium assistant unavailable",
        ) from exc


@router.post("/admin/bypass-route")
async def post_bypass_route(
    request: Request,
) -> BypassResponse | FrontendBypassResponse:
    body = await read_json_object(request)
    if _is_frontend_bypass(body):
        return bypass_route_frontend(validate_model(FrontendBypass, body))
    return execute_bypass_route(validate_model(BypassCommand, body))


@router.get("/health")
async def v1_health() -> dict[str, str]:
    return {"status": "ok", "pipeline": "rest+websocket-ready"}

"""REST API v1 endpoint declarations."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.orm import Session

from config.app_state import get_stadium_snapshot
from config.database import get_db
from controllers.admin_controller import execute_bypass_route
from controllers.ai_controller import stadium_assistant
from controllers.ticket_controller import (
    book_ticket,
    book_ticket_full,
    get_seat_status,
    lock_seat,
)
from models.frontend_contracts import (
    FrontendAssistant,
    FrontendAssistantResponse,
    FrontendBookTicket,
    FrontendBookTicketResponse,
    FrontendBypass,
    FrontendBypassResponse,
)
from models.schemas import (
    BookTicketFull,
    BookTicketFullResponse,
    BypassCommand,
    BypassResponse,
    ChatMessage,
    ChatResponse,
    LockSeatRequest,
    LockSeatResponse,
    SeatStatusListResponse,
    TicketBooking,
    TicketBookingResponse,
)
from routes.request_utils import read_json_object, validate_model
from services.frontend_adapter import (
    book_ticket_frontend,
    bypass_route_frontend,
    stadium_assistant_frontend,
)
from services.traffic_service import register_ws, unregister_ws

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["v1"])


def _is_frontend_ticket(body: dict[str, Any]) -> bool:
    return "seatId" in body and "userName" in body


def _is_frontend_bypass(body: dict[str, Any]) -> bool:
    return "congestedGateId" in body and "targetDiversionGateId" in body


def _is_frontend_assistant(body: dict[str, Any]) -> bool:
    return "message" in body and "userId" in body


@router.get("/seats/status/{stand_name}", response_model=SeatStatusListResponse)
def get_stand_seats(
    stand_name: str,
    db: Session = Depends(get_db),
) -> SeatStatusListResponse:
    return get_seat_status(db, stand_name)


@router.post("/seats/lock", response_model=LockSeatResponse)
def post_lock_seat(
    payload: LockSeatRequest,
    db: Session = Depends(get_db),
) -> LockSeatResponse:
    return lock_seat(db, payload)


@router.post("/tickets/book")
async def post_book_ticket(
    request: Request,
    db: Session = Depends(get_db),
) -> TicketBookingResponse | FrontendBookTicketResponse | BookTicketFullResponse:
    body = await read_json_object(request)
    if _is_frontend_ticket(body):
        ft = validate_model(FrontendBookTicket, body)
        if body.get("startingLocation") or body.get("transportMode"):
            return book_ticket_full(
                db,
                BookTicketFull(
                    userName=ft.userName,
                    gender=ft.gender,
                    teamAllegiance=ft.teamAllegiance,
                    seatId=ft.seatId,
                    startingLocation=str(
                        body.get("startingLocation", "Ekana approach")
                    ),
                    transportMode=str(body.get("transportMode", "metro")),
                ),
            )
        return book_ticket_frontend(ft)
    if "seatId" in body and "userName" in body:
        return book_ticket_full(db, validate_model(BookTicketFull, body))
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


@router.get("/stadium/snapshot")
def stadium_snapshot() -> dict[str, Any]:
    return get_stadium_snapshot()


@router.websocket("/stadium/live-stream")
async def stadium_live_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    register_ws(websocket)
    try:
        snap = get_stadium_snapshot()
        await websocket.send_json(
            {
                "liveScore": snap.get("match", {}).get("runs", 0),
                "wickets": snap.get("match", {}).get("wickets", 0),
                "overs": snap.get("match", {}).get("overs", 0),
                "winProbability": snap.get("match", {}).get("win_probability", "—"),
                "agentReactionText": "Connected to BlueLock live stream.",
                "isWicket": False,
                "isBoundary": False,
                "gates": [],
            }
        )
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        unregister_ws(websocket)


@router.get("/health")
async def v1_health() -> dict[str, str]:
    return {"status": "ok", "pipeline": "rest+websocket-ready"}

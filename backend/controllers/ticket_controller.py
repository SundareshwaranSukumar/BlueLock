"""Seat inventory, locking, and ticket booking with QR issuance."""

from __future__ import annotations

import base64
import io
import uuid
from datetime import UTC, datetime

import qrcode
from fastapi import HTTPException
from sqlalchemy.orm import Session

from config.gate_state import STAND_GATE_MAP, get_all_gates, increment_gate_load
from config.match_config import EKANA_STANDS
from models.db_models import SeatStatus, UserTicket
from models.schemas import (
    BookTicketFull,
    BookTicketFullResponse,
    LockSeatRequest,
    LockSeatResponse,
    SeatStatusItem,
    SeatStatusListResponse,
    TicketBooking,
    TicketBookingResponse,
)
from services.gemini_service import generate_stadium_guidance


def _normalize_stand(stand_vector: str) -> str:
    return stand_vector.strip().lower()


def _select_least_loaded_gate(stand_vector: str) -> tuple[str, int, int]:
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


def get_seat_status(db: Session, stand_name: str) -> SeatStatusListResponse:
    if stand_name not in EKANA_STANDS:
        raise HTTPException(status_code=404, detail=f"Unknown stand: {stand_name}")
    rows = (
        db.query(SeatStatus)
        .filter(SeatStatus.stand_name == stand_name)
        .order_by(SeatStatus.seat_id)
        .all()
    )
    return SeatStatusListResponse(
        standName=stand_name,
        seats=[
            SeatStatusItem(
                seatId=r.seat_id,
                status=r.status,
                updatedAt=r.updated_at.isoformat(),
            )
            for r in rows
        ],
    )


def lock_seat(db: Session, payload: LockSeatRequest) -> LockSeatResponse:
    row = db.query(SeatStatus).filter(SeatStatus.seat_id == payload.seatId).first()
    if not row:
        raise HTTPException(status_code=404, detail="Seat not found")
    if row.status != "Available":
        raise HTTPException(status_code=409, detail=f"Seat is {row.status}")
    row.status = "Locked"
    row.updated_at = datetime.now(UTC)
    db.commit()
    return LockSeatResponse(seatId=row.seat_id, status="Locked")


def book_ticket_full(db: Session, payload: BookTicketFull) -> BookTicketFullResponse:
    row = db.query(SeatStatus).filter(SeatStatus.seat_id == payload.seatId).first()
    if not row:
        raise HTTPException(status_code=404, detail="Seat not found")
    if row.status not in ("Available", "Locked"):
        raise HTTPException(status_code=409, detail=f"Seat is {row.status}")

    stand_vector = _stand_vector_from_seat(payload.seatId, row.stand_name)
    gate_booking = book_ticket(
        TicketBooking(
            attendee_name=payload.userName,
            match_id=f"LSG-PBKS-{payload.teamAllegiance}",
            stand_vector=stand_vector,
            seat_section=payload.seatId,
            ticket_count=1,
        )
    )
    ui_gate = _backend_gate_to_letter(gate_booking.assigned_gate)

    transit_hint = ""
    try:
        transit_hint = generate_stadium_guidance(
            f"Fan {payload.userName} arrives from {payload.startingLocation} "
            f"via {payload.transportMode} to seat {payload.seatId} gate {ui_gate}. "
            "One sentence transit advice.",
            context=None,
        )
    except ValueError:
        transit_hint = (
            f"Proceed to Gate {ui_gate} via {payload.transportMode} "
            f"from {payload.startingLocation}."
        )

    ticket_id = str(uuid.uuid4())
    row.status = "Booked"
    row.updated_at = datetime.now(UTC)
    db.add(
        UserTicket(
            ticket_id=ticket_id,
            user_name=payload.userName,
            gender=payload.gender,
            team_allegiance=payload.teamAllegiance,
            stand_name=row.stand_name,
            seat_id=payload.seatId,
            starting_location=payload.startingLocation,
            transport_mode=payload.transportMode,
            assigned_gate=ui_gate,
            payment_status="paid_mock",
            created_at=datetime.now(UTC),
        )
    )
    db.commit()

    qr_b64 = _make_qr_svg_base64(ticket_id, payload.seatId, ui_gate)
    wallet = f"https://pay.google.com/gp/v/save/mock#{ticket_id}"

    return BookTicketFullResponse(
        ticketId=ticket_id,
        assignedGate=ui_gate,
        recommendedRoute=transit_hint[:500],
        nearestTransit="Metro Red Line · Ekana Stadium (400m)",
        entryCorridor=_corridor_for_gate(ui_gate),
        metroLoad=_queue_to_metro(gate_booking.estimated_queue_minutes),
        qrCodeSvgBase64=qr_b64,
        googleWalletLink=wallet,
        standName=row.stand_name,
        seatId=payload.seatId,
    )


def _stand_vector_from_seat(seat_id: str, stand_name: str) -> str:
    prefix = seat_id[0].upper() if seat_id else "N"
    mapping = {"N": "north", "S": "south", "E": "east", "W": "west"}
    if prefix in mapping:
        return mapping[prefix]
    name_map = {
        "North Block": "north",
        "South Block": "south",
        "East Lounge": "east",
        "West Terrace": "west",
    }
    return name_map.get(stand_name, "north")


def _backend_gate_to_letter(gate_id: str) -> str:
    if "A" in gate_id:
        return "A"
    if "B" in gate_id:
        return "B"
    if "C" in gate_id:
        return "C"
    return "D"


def _corridor_for_gate(gate: str) -> str:
    return {"A": "North", "B": "South", "C": "East", "D": "West"}.get(gate, "North")


def _queue_to_metro(minutes: int) -> str:
    if minutes <= 10:
        return "ok"
    if minutes <= 25:
        return "warn"
    return "crit"


def _make_qr_svg_base64(ticket_id: str, seat_id: str, gate: str) -> str:
    payload = f"BLUELOCK:{ticket_id}|{seat_id}|G{gate}"
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")

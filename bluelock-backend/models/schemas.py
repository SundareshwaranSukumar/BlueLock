"""Pydantic data contracts for BlueLock API boundaries."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TicketBooking(BaseModel):
    attendee_name: str = Field(..., min_length=1, max_length=120)
    match_id: str = Field(..., min_length=1, max_length=64)
    stand_vector: str = Field(
        ...,
        description="Seating stand vector: north, south, east, west, or vip",
    )
    seat_section: str = Field(..., min_length=1, max_length=32)
    ticket_count: int = Field(default=1, ge=1, le=20)


class TicketBookingResponse(BaseModel):
    booking_id: str
    assigned_gate: str
    stand_vector: str
    estimated_queue_minutes: int
    gate_load_after: int
    gate_capacity: int


class ChatMessage(BaseModel):
    user_message: str = Field(..., min_length=1, max_length=4000)
    context: str | None = Field(
        default=None,
        description="Optional stadium context string injected into the assistant",
    )
    session_id: str | None = Field(default=None, max_length=64)


class ChatResponse(BaseModel):
    reply: str
    model: str
    session_id: str | None = None


class BypassCommand(BaseModel):
    director_id: str = Field(..., min_length=1, max_length=64)
    target_gate_id: str = Field(..., min_length=1, max_length=32)
    instruction: str = Field(..., min_length=1, max_length=2000)
    boundary_override: int | None = Field(
        default=None,
        ge=0,
        le=50000,
        description="Optional new capacity boundary for the gate",
    )


class BypassResponse(BaseModel):
    success: bool
    gate_id: str
    bypass_active: bool
    capacity_limit: int
    logged_instruction: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

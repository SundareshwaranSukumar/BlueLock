"""Pydantic models aligned with the TanStack frontend API client."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

GateLetter = Literal["A", "B", "C", "D"]
Gender = Literal["Male", "Female"]
Team = Literal["CSK", "MI"]
Corridor = Literal["North", "South", "East", "West"]
FlowStatus = Literal["ok", "warn", "crit"]
SuggestedAction = Literal["REDIRECT", "STAY", "PROCEED"]


class FrontendBookTicket(BaseModel):
    userName: str = Field(..., min_length=1, max_length=120)
    gender: Gender
    teamAllegiance: Team
    seatId: str = Field(..., min_length=2, max_length=20)


class FrontendBookTicketResponse(BaseModel):
    ticketId: str
    assignedGate: GateLetter
    recommendedRoute: str
    nearestTransit: str
    entryCorridor: Corridor
    metroLoad: FlowStatus


class FrontendBypass(BaseModel):
    congestedGateId: GateLetter
    targetDiversionGateId: GateLetter
    staffDirectiveText: str = Field(..., min_length=1, max_length=2000)


class FrontendBypassResponse(BaseModel):
    status: Literal["DISPATCHED"] = "DISPATCHED"
    clientsNotifiedCount: int


class FrontendAssistant(BaseModel):
    userId: str = Field(..., min_length=1, max_length=80)
    message: str = Field(..., min_length=1, max_length=4000)
    currentGate: str | None = Field(default=None, max_length=20)
    userLocationContext: str | None = Field(default=None, max_length=200)


class FrontendAssistantResponse(BaseModel):
    replyText: str
    suggestedAction: SuggestedAction
    targetGate: GateLetter | None = None

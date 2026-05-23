"""SQLAlchemy ORM models for ticketing persistence."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserTicket(Base):
    __tablename__ = "user_tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticket_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_name: Mapped[str] = mapped_column(String(120))
    gender: Mapped[str] = mapped_column(String(16))
    team_allegiance: Mapped[str] = mapped_column(String(16))
    stand_name: Mapped[str] = mapped_column(String(64))
    seat_id: Mapped[str] = mapped_column(String(32))
    starting_location: Mapped[str] = mapped_column(String(200), default="")
    transport_mode: Mapped[str] = mapped_column(String(32), default="metro")
    assigned_gate: Mapped[str] = mapped_column(String(16))
    payment_status: Mapped[str] = mapped_column(String(32), default="paid_mock")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class SeatStatus(Base):
    __tablename__ = "seat_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stand_name: Mapped[str] = mapped_column(String(64), index=True)
    seat_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(16))  # Available | Locked | Booked
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

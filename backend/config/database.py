"""SQLAlchemy engine, session factory, and Ekana seat seed."""

from __future__ import annotations

import os
from collections.abc import Generator
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from config.match_config import EKANA_STANDS, SEATS_PER_STAND
from models.db_models import Base, SeatStatus

DB_PATH = Path(__file__).resolve().parent.parent / "bluelock.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
    if DATABASE_URL.startswith("sqlite")
    else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(SeatStatus).count() == 0:
            _seed_ekana_seats(db)
    finally:
        db.close()


def _seed_ekana_seats(db: Session) -> None:
    now = datetime.now(UTC)
    prefix_map = {
        "North Block": "N",
        "South Block": "S",
        "East Lounge": "E",
        "West Terrace": "W",
    }
    for stand in EKANA_STANDS:
        pfx = prefix_map[stand]
        for i in range(1, SEATS_PER_STAND + 1):
            seat_id = f"{pfx}-{i:02d}"
            db.add(
                SeatStatus(
                    stand_name=stand,
                    seat_id=seat_id,
                    status="Available",
                    updated_at=now,
                )
            )
    db.commit()

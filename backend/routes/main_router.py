"""Global API gateway registration."""

from __future__ import annotations

from fastapi import APIRouter

from routes.v1_routes import router as v1_router

api_router = APIRouter()
api_router.include_router(v1_router)

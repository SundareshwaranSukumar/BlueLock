"""BlueLock operational application entry gate."""

from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import HealthResponse
from routes.main_router import api_router

load_dotenv()

APP_VERSION = "1.0.0"

app = FastAPI(
    title="BlueLock Command Grid API",
    description="Smart Stadium & Crowd Dispersal backend for Agentic Premier League",
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service="bluelock-backend",
        version=APP_VERSION,
    )

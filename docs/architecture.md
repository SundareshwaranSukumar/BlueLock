# Architecture Overview

BlueLock is a **smart stadium command grid** for crowd dispersal at **Ekana Cricket Stadium** (LSG vs PBKS anchor fixture). The monorepo couples a **TanStack Start** fan/director UI with a **FastAPI** backend, **SQLite** seat inventory, and **Google Gemini 1.5 Flash** for the concierge channel.

## Goals

- Prevent double booking with atomic seat lock/book in SQLite.
- Balance entry load across gates **A–D** using stand-aware routing.
- Give fans an AI concierge with live gate context.
- Let directors issue bypass directives that update operational gate boundaries immediately.
- Sample real traffic near Ekana via **Google Maps Platform Routes API** when configured.

## Repository layout

```
BlueLock/
├── frontend/          # TanStack Start + Vite + React 19
├── backend/           # FastAPI + SQLAlchemy + google-genai
├── docs/              # Architecture, API, deployment
├── scripts/           # launch, deploy-gcp, check-static, ensure-node
├── docker-compose.yml # Local backend container (host port 8000)
├── Dockerfile         # Backend Cloud Run image
└── .env.template      # Root deploy config for Cloud Run
```

## Layered backend (SOLID)

| Layer | Path | Responsibility |
|-------|------|----------------|
| Entry | `main.py` | App factory, CORS, `/health`, DB init |
| Routes | `routes/v1_routes.py` | HTTP + WebSocket mapping; validation via `request_utils` |
| Controllers | `controllers/*` | Domain use cases (tickets, admin, AI) |
| Services | `gemini_service.py`, `google_traffic_service.py`, `cricket_service.py`, `traffic_service.py`, `frontend_adapter.py` | Integrations + telemetry loop |
| Persistence | `config/database.py`, `models/db_models.py` | SQLite `SeatStatus` / `UserTicket` |
| Contracts | `models/schemas.py`, `models/frontend_contracts.py` | Pydantic boundaries |

## Frontend architecture

- **State:** Zustand (`useStadiumStore`) — views 1–5 (landing → booking → stadium → stats → admin).
- **API client:** `src/services/api.ts` — typed `fetch` to `/api/v1/*`; WebSocket URL from `VITE_TELEMETRY_WS_URL` or derived `wss://` from `VITE_API_BASE_URL`.
- **Transport modes:**
  1. **Integrated:** `VITE_USE_BACKEND=true` — Vite dev proxy and TanStack handlers forward to FastAPI (`backend-proxy.ts`).
  2. **Mock:** TanStack handlers answer locally when `USE_BACKEND` is unset/false.
  3. **Production:** Two Cloud Run services — static frontend (nginx) calls backend API URL via `VITE_API_BASE_URL`.

## Gate identity model

The UI uses concourse gates **A–D**. The backend tracks clusters (`GATE-A`, `GATE-B`, `GATE-C`, `GATE-D`). `services/frontend_adapter.py` translates between them so UI components stay unchanged.

## Telemetry path

`traffic_service.run_traffic_loop` builds packets every ~3s: cricket snapshot, gate/parking simulation, optional Google Routes traffic, then broadcasts on `WS /api/v1/stadium/live-stream`.

## AI path (integrated mode)

`ConciergeDrawer` → `apiClient.assistant` → FastAPI → `stadium_assistant_frontend` → Gemini with gate snapshot → JSON tail → `suggestedAction` / `targetGate`.

## Diagrams

PlantUML sources: [`diagrams/architecture.puml`](./diagrams/architecture.puml)

# Architecture Overview

BlueLock is a **smart stadium command grid** for crowd dispersal at M. Chinnaswamy Stadium. The monorepo couples a **TanStack Start** fan/director UI with a **FastAPI** backend and **Google Gemini 1.5 Flash** for the concierge channel.

## Goals

- Balance entry load across gates using stand-aware routing.
- Give fans an AI concierge with live gate context.
- Let directors issue bypass directives that update operational gate boundaries immediately.

## Repository layout

```
BlueLock/
├── frontend/          # TanStack Start + Vite + React 19
├── backend/           # FastAPI + google-genai SDK
├── docs/              # Architecture, API, deployment
├── scripts/           # launch, deploy-firebase, check-static
├── docker-compose.yml # Backend container (host port 8000)
└── firebase.json      # Hosting + Cloud Run API rewrites
```

## Layered backend (SOLID)

| Layer | Path | Responsibility |
|-------|------|----------------|
| Entry | `main.py` | App factory, CORS, `/health` |
| Routes | `routes/v1_routes.py` | HTTP mapping; validation via `request_utils` |
| Controllers | `controllers/*` | Domain use cases |
| Services | `gemini_service.py`, `frontend_adapter.py` | GenAI + UI contract mapping |
| State | `config/database.py` | Thread-safe in-memory gates |
| Contracts | `models/schemas.py`, `models/frontend_contracts.py` | Pydantic boundaries |

## Frontend architecture

- **State:** Zustand (`useStadiumStore`).
- **API client:** `src/services/api.ts` — typed `fetch` to `/api/v1/*`.
- **Transport modes:**
  1. **Integrated:** `VITE_USE_BACKEND=true` — Vite dev proxy and TanStack handlers forward to FastAPI.
  2. **Mock:** TanStack handlers answer locally when `USE_BACKEND` is unset/false.
  3. **Production:** Firebase Hosting static client + `/api/**` rewrites to Cloud Run.

## Gate identity model

The UI uses concourse gates **A–D**. The backend tracks clusters (`N-A`, `E-A`, `W-A`, `S-A`, …). `services/frontend_adapter.py` translates between them so UI components stay unchanged.

## AI path (integrated mode)

`ConciergeDrawer` → `apiClient.assistant` → FastAPI → `stadium_assistant_frontend` → Gemini with gate snapshot → JSON tail → `suggestedAction` / `targetGate`.

## Diagrams

PlantUML sources: [`diagrams/architecture.puml`](./diagrams/architecture.puml)

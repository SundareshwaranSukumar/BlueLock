# BlueLock Backend

FastAPI command grid for gate orchestration, Gemini-powered stadium guidance, and director bypass control. Pairs with the TanStack Start frontend in `../frontend/`.

Monorepo docs: [../docs/](../docs/) · API integration: [../docs/api-integration.md](../docs/api-integration.md)

## Layout

```
backend/
├── config/database.py           # In-memory gate state
├── controllers/                 # Domain use cases
├── models/
│   ├── schemas.py               # Native API contracts
│   └── frontend_contracts.py    # TanStack client contracts
├── routes/
│   ├── v1_routes.py
│   └── request_utils.py
├── services/
│   ├── gemini_service.py
│   └── frontend_adapter.py      # UI gate A–D ↔ backend N-A, E-A, …
├── main.py
├── Dockerfile
└── pyproject.toml               # Ruff + Mypy config
```

## Quick start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.template .env              # set GEMINI_API_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

| Endpoint | URL |
|----------|-----|
| Health | `GET http://localhost:8000/health` |
| OpenAPI | `http://localhost:8000/docs` |

## Dual API contracts

The same paths accept **either** payload shape (auto-detected from JSON keys):

| Path | Frontend (TanStack) | Native (OpenAPI tools) |
|------|---------------------|-------------------------|
| `POST /api/v1/tickets/book` | `userName`, `seatId`, … | `attendee_name`, `stand_vector`, … |
| `POST /api/v1/ai/stadium-assistant` | `userId`, `message`, … | `user_message`, `context`, … |
| `POST /api/v1/admin/bypass-route` | `congestedGateId`, … | `director_id`, `target_gate_id`, … |

See [../docs/api-integration.md](../docs/api-integration.md) for field mapping.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | For AI routes | Google GenAI API key |
| `CORS_ORIGINS` | No | Comma-separated origins; default `*` |
| `APP_ENV` | No | `development` / `production` |
| `PORT` | Cloud Run | Default `8080` in container |

## Static analysis

From repository root:

```bash
./scripts/check-static.sh
# Windows:
.\scripts\check-static.ps1
```

Runs Ruff, Mypy (backend), and `npm run build:firebase` (frontend).

## Deploy

Cloud Run and Firebase steps live in [../docs/deployment.md](../docs/deployment.md). Deploy scripts: `../scripts/deploy-firebase.*`, `../scripts/launch.*`.

## License

Apache 2.0 — see [../LICENSE](../LICENSE).

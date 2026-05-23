# API integration

## Base URL

| Environment | Base |
|-------------|------|
| Local dev | Vite proxies `/api/v1` → `http://127.0.0.1:8000` (`BACKEND_URL` in `frontend/.env.local`) |
| Cloud Run (production) | Browser calls backend URL (`VITE_API_BASE_URL`); WebSocket via `VITE_TELEMETRY_WS_URL` or auto `wss://` from API base |

## REST

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/api/v1/seats/status/{stand_name}` | Ekana stand inventory (`North Block`, …) |
| POST | `/api/v1/seats/lock` | `{ "seatId": "N-01" }` — marks seat `Locked` |
| POST | `/api/v1/tickets/book` | Frontend or full booking body — marks seat `Booked`, returns QR + gate |
| POST | `/api/v1/admin/bypass-route` | Director gate bypass |
| POST | `/api/v1/ai/stadium-assistant` | Gemini concierge |
| GET | `/api/v1/stadium/snapshot` | Full telemetry cache |

### Booking response (frontend shape)

| Field | Notes |
|-------|--------|
| `ticketId` | UUID |
| `assignedGate` | `A`–`D` |
| `qrCodeSvgBase64` | PNG bytes, base64 (field name legacy) |
| `googleWalletLink` | **Mock** save URL — not a live Wallet Objects integration |
| `recommendedRoute` | Gemini transit hint or fallback string |

## WebSocket

`WS /api/v1/stadium/live-stream` — JSON telemetry every ~3s (live cricket when keys set, synthetic gates/parking, optional Google Routes traffic).

Frontend resolution order (`telemetryWsUrl()` in `src/services/api.ts`):

1. `VITE_TELEMETRY_WS_URL` if set
2. `wss://<host>/api/v1/stadium/live-stream` derived from `VITE_API_BASE_URL`
3. Same-origin `ws`/`wss` when `VITE_USE_BACKEND=true` in dev

Deploy scripts set (2) automatically after backend deploy.

## Env vars

### Backend (`backend/.env`) — local

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Stadium AI assistant |
| `GOOGLE_MAPS_API_KEY` | Routes API traffic near Ekana (`GOOGLE_CLOUD_API_KEY` alias) |
| `CRICAPI_KEY` / `RAPIDAPI_KEY` | Live cricket scores |
| `DATABASE_URL` | Default `sqlite:///bluelock.db` |
| `CORS_ORIGINS` | Comma-separated origins; default `*` |

### Root (`.env`) — deploy only

See [`.env.template`](../.env.template) and [deployment.md](./deployment.md).

### Frontend (`frontend/.env.local`) — local

| Variable | Purpose |
|----------|---------|
| `VITE_USE_BACKEND` | `true` → proxy / server forward to FastAPI |
| `BACKEND_URL` | Proxy upstream (e.g. `http://127.0.0.1:8000`) |

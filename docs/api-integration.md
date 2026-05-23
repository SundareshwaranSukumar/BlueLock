# API integration

## Base URL

| Environment | Base |
|-------------|------|
| Local dev | Vite proxies `/api/v1` → `http://127.0.0.1:8000` |
| Firebase Hosting | Rewrites `/api/**` → Cloud Run |

## REST

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health |
| GET | `/api/v1/seats/status/{stand_name}` | Ekana stand inventory |
| POST | `/api/v1/seats/lock` | `{ "seatId": "N-01" }` |
| POST | `/api/v1/tickets/book` | Frontend or full booking body |
| POST | `/api/v1/admin/bypass-route` | Director gate bypass |
| POST | `/api/v1/ai/stadium-assistant` | Gemini concierge |
| GET | `/api/v1/stadium/snapshot` | Full telemetry cache |

## WebSocket

`WS /api/v1/stadium/live-stream` — JSON `TelemetryPacket` every ~3s (live cricket + synthetic gates/parking).

Frontend: set `VITE_USE_BACKEND=true`; optional `VITE_TELEMETRY_WS_URL`.

## Env vars

See `backend/.env.template`.

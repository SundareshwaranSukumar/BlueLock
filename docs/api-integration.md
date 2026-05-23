# API Integration

The frontend and backend share **the same URL paths**. Payloads are defined in `frontend/src/services/api.ts` and validated in `backend/models/frontend_contracts.py`.

## Base URL resolution

| Environment | Configuration | Request path |
|-------------|---------------|--------------|
| Local integrated | `VITE_USE_BACKEND=true`, `BACKEND_URL=http://127.0.0.1:8000` | Browser → Vite proxy → FastAPI |
| SSR / server handlers | `USE_BACKEND=true` or `BACKEND_URL` set | TanStack route → `proxyPostToBackend` |
| Firebase production | `firebase.json` rewrites | Browser → Cloud Run |
| Direct API | `VITE_API_BASE_URL=https://….run.app` | Browser → Cloud Run (`CORS_ORIGINS` must allow origin) |

## Validation and errors

| Status | When |
|--------|------|
| `422` | Invalid JSON or Pydantic validation failure |
| `503` | `GEMINI_API_KEY` missing (AI routes) |
| `502` | Upstream GenAI failure |
| `503` | Backend unreachable from TanStack proxy (connection error) |

## Endpoints

### `POST /api/v1/tickets/book`

**Request (frontend)**

```json
{
  "userName": "Alex",
  "gender": "Male",
  "teamAllegiance": "CSK",
  "seatId": "R-12-A"
}
```

`gender` is accepted for contract compatibility; routing uses `seatId` and `teamAllegiance` only.

**Response (frontend)**

```json
{
  "ticketId": "uuid",
  "assignedGate": "A",
  "recommendedRoute": "Enter via North concourse → Gate A → Raghavendra Stand.",
  "nearestTransit": "Namma Metro · Cubbon Park (350m)",
  "entryCorridor": "North",
  "metroLoad": "ok"
}
```

**Backend mapping**

- `seatId[0]` → `stand_vector` (`R`→north, `P`→east, `G`→west, `M`→south)
- Least-load gate in cluster → `assigned_gate` (`N-A`, …) → UI gate `A`–`D`
- `estimated_queue_minutes` → `metroLoad` (`ok` ≤10 min, `warn` ≤25, else `crit`)

### `POST /api/v1/admin/bypass-route`

**Request**

```json
{
  "congestedGateId": "D",
  "targetDiversionGateId": "B",
  "staffDirectiveText": "[DIRECTOR TO STAFF]: …"
}
```

**Response**

```json
{
  "status": "DISPATCHED",
  "clientsNotifiedCount": 1420
}
```

**Backend mapping**

- `targetDiversionGateId` → backend gate (`B` → `E-A`)
- `execute_bypass_route` sets `bypass_active` and logs instruction
- `clientsNotifiedCount` is `0` when the target gate is unknown; otherwise `800 + total_load/2`

### `POST /api/v1/ai/stadium-assistant`

**Request**

```json
{
  "userId": "fan-1",
  "message": "Gate D feels crowded",
  "currentGate": "D",
  "userLocationContext": "Metro stand"
}
```

**Response**

```json
{
  "replyText": "…",
  "suggestedAction": "REDIRECT",
  "targetGate": "B"
}
```

**Backend mapping**

- Wrapped as `ChatMessage` with live gate snapshot + JSON format hint for Gemini
- Reply parsed for trailing `{"suggestedAction":…,"targetGate":…}`

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Cloud Run / Docker liveness |
| `GET /api/v1/health` | API pipeline marker |

## Native backend schema

Requests with `attendee_name`, `match_id`, and `stand_vector` (no `seatId`) use `models/schemas.py` and return native response shapes. See `backend/README.md` and OpenAPI at `/docs`.

# BlueLock — Smart Stadium & Crowd Dispersal Command Grid

Production-grade Python backend for real-time gate orchestration, AI-assisted spectator guidance, and director-level bypass control. Built for **Agentic Premier League** Phase 1 & Phase 2 screening: functional fulfillment, security boundaries, horizontal scalability patterns, and static code quality via strict SOLID layering.

---

## Project Overview

Large venues face predictable failure modes: **entry congestion** at narrow gate clusters, **imbalanced stand-to-gate routing** that creates invisible queues, and **slow emergency egress** when staff lack a single operational picture. BlueLock addresses these vulnerabilities by:

| Problem | BlueLock Response |
|--------|-------------------|
| Overcrowded gates | Dynamic gate assignment from seating **stand vectors** with least-load balancing |
| Fragmented fan guidance | **Gemini 1.5 Flash** concierge with live gate context injection |
| Director override latency | **Bypass route** channel that logs instructions and mutates in-memory gate boundaries instantly |

The backend is decoupled from Next.js / Lovable frontends: REST contracts are stable, state is thread-safe in memory (replaceable with Redis/Firestore in scale-out), and AI calls are isolated behind a dedicated service boundary.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Client Tier (Next.js / Lovable)                    │
│   Ticket UI │ Stadium Assistant Chat │ Director Admin Panel             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS / WSS (future)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              Firebase Hosting (static export / SSR assets)               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ API calls → Cloud Run URL
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Google Cloud Run — bluelock-backend                   │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────────┐  │
│  │ main_router │──▶│  v1_routes   │──▶│ controllers (SRP per domain) │  │
│  └─────────────┘   └──────────────┘   └───────────┬─────────────────┘  │
│                                                    │                     │
│         ┌──────────────────────────────────────────┼──────────────┐     │
│         ▼                    ▼                     ▼              ▼     │
│   ticket_controller    ai_controller      admin_controller   config/  │
│         │                    │                     │          database  │
│         └────────────────────┴─────────────────────┘                   │
│                              │                                           │
│                              ▼                                           │
│                    services/gemini_service.py                            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ GEMINI_API_KEY (Secret Manager in prod)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Google GenAI — gemini-1.5-flash                        │
│              BlueLock Operational Persona (temp=0.3)                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### SOLID Layering

| Layer | Responsibility |
|-------|----------------|
| `routes/` | HTTP transport only; no business rules |
| `controllers/` | Use-case orchestration per domain |
| `services/` | External integrations (Gemini SDK) |
| `config/database.py` | Thread-safe in-memory gate state |
| `models/schemas.py` | Pydantic contracts at system boundaries |

---

## Directory Structure

```
bluelock-backend/
├── config/database.py
├── controllers/
│   ├── admin_controller.py
│   ├── ai_controller.py
│   └── ticket_controller.py
├── routes/
│   ├── v1_routes.py
│   └── main_router.py
├── services/gemini_service.py
├── models/schemas.py
├── .env.template
├── .gitignore
├── Dockerfile
├── requirements.txt
├── README.md
└── main.py
```

---

## Quick Start (Local)

```bash
cd bluelock-backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements.txt
copy .env.template .env   # Windows
# cp .env.template .env   # macOS / Linux
# Edit .env and set GEMINI_API_KEY

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

| Endpoint | URL |
|----------|-----|
| Health | `GET http://localhost:8000/health` |
| OpenAPI | `http://localhost:8000/docs` |

---

## API Specification Index

### `GET /health`

System liveness probe for Cloud Run and load balancers.

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"healthy"` when process is up |
| `service` | string | `"bluelock-backend"` |
| `version` | string | Semantic API version |

**Example response**

```json
{
  "status": "healthy",
  "service": "bluelock-backend",
  "version": "1.0.0"
}
```

---

### `POST /api/v1/tickets/book`

Assigns the least-utilized gate for the requested **stand vector** and increments gate load.

**Request body (`TicketBooking`)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `attendee_name` | string | yes | 1–120 chars |
| `match_id` | string | yes | Match identifier |
| `stand_vector` | string | yes | `north`, `south`, `east`, `west`, `vip` |
| `seat_section` | string | yes | Section label |
| `ticket_count` | integer | no | Default `1`, max `20` |

**Response (`TicketBookingResponse`)**

| Field | Type | Description |
|-------|------|-------------|
| `booking_id` | string | UUID booking reference |
| `assigned_gate` | string | e.g. `N-A`, `S-B` |
| `stand_vector` | string | Normalized stand |
| `estimated_queue_minutes` | integer | Heuristic wait estimate |
| `gate_load_after` | integer | Load after booking |
| `gate_capacity` | integer | Current capacity boundary |

**Example**

```json
// Request
{
  "attendee_name": "Alex Morgan",
  "match_id": "APL-2026-05-23",
  "stand_vector": "north",
  "seat_section": "N-12",
  "ticket_count": 2
}

// Response
{
  "booking_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "assigned_gate": "N-A",
  "stand_vector": "north",
  "estimated_queue_minutes": 8,
  "gate_load_after": 142,
  "gate_capacity": 1200
}
```

---

### `POST /api/v1/ai/stadium-assistant`

Multimodal AI concierge; merges optional client context with live gate snapshot before calling Gemini.

**Request body (`ChatMessage`)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_message` | string | yes | Fan query (max 4000 chars) |
| `context` | string | no | Extra injected context |
| `session_id` | string | no | Client session correlation |

**Response (`ChatResponse`)**

| Field | Type | Description |
|-------|------|-------------|
| `reply` | string | Model guidance text |
| `model` | string | `gemini-1.5-flash` |
| `session_id` | string | Echo of request session |

**Errors**

| Status | Condition |
|--------|-----------|
| `503` | `GEMINI_API_KEY` missing or placeholder |
| `502` | Upstream GenAI failure |

---

### `POST /api/v1/admin/bypass-route`

Director panel channel: logs instruction and updates gate bypass flag and optional capacity boundary.

**Request body (`BypassCommand`)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `director_id` | string | yes | Authorizing director ID |
| `target_gate_id` | string | yes | Gate ID e.g. `E-A` |
| `instruction` | string | yes | Operational directive |
| `boundary_override` | integer | no | New capacity limit |

**Response (`BypassResponse`)**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether gate was found and updated |
| `gate_id` | string | Target gate |
| `bypass_active` | boolean | Bypass mode flag |
| `capacity_limit` | integer | Current boundary |
| `logged_instruction` | string | Stored instruction text |

**Valid gate IDs**

`N-A`, `N-B`, `S-A`, `S-B`, `E-A`, `E-B`, `W-A`, `W-B`, `VIP-1`, `VIP-2`

---

### `GET /api/v1/health`

Versioned pipeline health (`rest+websocket-ready`).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | yes (for AI routes) | Google GenAI API key |
| `APP_ENV` | no | `development` / `production` |
| `LOG_LEVEL` | no | Logging verbosity |
| `PORT` | no | Set by Cloud Run (default `8080`) |

Copy `.env.template` → `.env` locally. **Never commit `.env`.**

---

## GCP Cloud Run Deployment

### Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- Billing-enabled GCP project
- Artifact Registry or Container Registry enabled

### Build and deploy

```bash
cd bluelock-backend

# Authenticate and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com

# Create Artifact Registry repo (once)
gcloud artifacts repositories create bluelock \
  --repository-format=docker \
  --location=us-central1

# Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build image
docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/bluelock/backend:latest .

# Push
docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/bluelock/backend:latest

# Deploy to Cloud Run
gcloud run deploy bluelock-backend \
  --image us-central1-docker.pkg.dev/YOUR_PROJECT_ID/bluelock/backend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --port 8080
```

Store `GEMINI_API_KEY` in **Secret Manager** and map it as shown. Restrict `--allow-unauthenticated` in production; prefer IAM + API Gateway for director routes.

### Verify deployment

```bash
CLOUD_RUN_URL=$(gcloud run services describe bluelock-backend --region us-central1 --format='value(status.url)')
curl -s "$CLOUD_RUN_URL/health"
```

---

## Firebase Hosting (Frontend Static Assets)

Assumes a Next.js or Vite export in a sibling `frontend/` directory.

```bash
npm install -g firebase-tools
firebase login

# From frontend project root
firebase init hosting
# Select your Firebase project
# Set public directory: out  (Next.js static export) or dist (Vite)

# Build static assets
npm run build
# Next.js static export example:
# next build && next export -o out

firebase deploy --only hosting
```

Point frontend environment variables at the Cloud Run URL:

```env
NEXT_PUBLIC_API_BASE_URL=https://bluelock-backend-xxxxx-uc.a.run.app
```

Configure Firebase Hosting rewrites in `firebase.json` if you need same-origin API proxying:

```json
{
  "hosting": {
    "public": "out",
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "bluelock-backend",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

---

## Security Notes

- API keys only via environment / Secret Manager; never in source control
- `.gitignore` blocks `.env`, `__pycache__/`, and virtual environments
- Admin bypass routes should be protected with auth middleware before production (JWT, IAP, or API keys)
- CORS is permissive for hackathon integration; tighten `allow_origins` per deployment

---

## Scalability Path

| Current | Scale-out |
|---------|-----------|
| In-memory gate state | Redis / Firestore with pub/sub |
| Single Cloud Run instance | Min instances + regional load balancing |
| REST only | WebSocket telemetry on `v1_routes` extension point |

---

## License

See repository root `LICENSE`.

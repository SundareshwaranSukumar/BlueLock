# Deployment Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend (local) |
| Node.js | **22.12.0** via `.nvmrc` (min 20.19+ / 22.12+ for Vite 7) | Frontend build |
| Bun | optional | Faster frontend installs |
| Docker | optional | **Local** backend via `docker-compose` |
| `gcloud` | latest | Cloud Run backend deploy |
| `firebase` CLI | latest | **Production** Firebase Hosting (`npm install -g firebase-tools`) |

## Production (recommended): Firebase Hosting + Cloud Run backend

| Layer | Target | Notes |
|-------|--------|--------|
| Static UI | **Firebase Hosting** | `frontend/dist/client` after `npm run build:production` |
| API + WebSocket | **Cloud Run** `bluelock-backend` | Proxied via Hosting rewrites: `/api/**`, `/health` |

The production frontend build uses **same-origin** paths (`VITE_USE_BACKEND=true`, no `VITE_API_BASE_URL`). REST and WebSocket traffic hit your Hosting domain; Firebase forwards `/api/**` and `/health` to Cloud Run in `us-central1` (configurable via `.env`).

### One-time setup

1. Create or select a GCP project (Firebase uses the same project ID).
2. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and [Firebase CLI](https://firebase.google.com/docs/cli).
3. Authenticate:

```bash
gcloud auth login
firebase login
```

4. Configure deploy env at the **repository root**:

```bash
cp .env.template .env
cp .firebaserc.example .firebaserc
```

Edit `.env`: `GCP_PROJECT_ID`, `GEMINI_API_KEY`, optional maps/cricket keys. Set `projects.default` in `.firebaserc` to the same project ID (or set `FIREBASE_PROJECT_ID` in `.env`).

5. Link Firebase to the GCP project (if not already): [Firebase console](https://console.firebase.google.com/) → Add project / use existing GCP project.

6. Use the **Blaze** (pay-as-you-go) plan — Hosting rewrites to Cloud Run require it.

7. Ensure Cloud Run API is enabled (the deploy scripts enable it automatically).

### Full deploy (backend + Hosting)

```bash
chmod +x scripts/deploy-firebase-full.sh scripts/deploy-firebase.sh scripts/ensure-node.sh
./scripts/deploy-firebase-full.sh
```

```powershell
Copy-Item .env.template .env
Copy-Item .firebaserc.example .firebaserc
# Edit .env and .firebaserc
.\scripts\deploy-firebase-full.ps1
```

This will:

1. Deploy **backend only** to Cloud Run (`DEPLOY_ONLY=backend` via `deploy-gcp.*`)
2. Set `CORS_ORIGINS` to `https://<project>.web.app` and `https://<project>.firebaseapp.com` when not set in `.env`
3. Build the frontend for same-origin API/WebSocket
4. Deploy **Firebase Hosting** only

### Hosting-only deploy (backend already on Cloud Run)

```bash
./scripts/deploy-firebase.sh
```

```powershell
.\scripts\deploy-firebase.ps1
```

### Root `.env` reference (Firebase path)

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_PROJECT_ID` | Yes | GCP / Firebase project id |
| `FIREBASE_PROJECT_ID` | No | Defaults to `GCP_PROJECT_ID` for `firebase deploy` |
| `GCP_REGION` | No | Default `us-central1` (must match `firebase.json` run region) |
| `BACKEND_SERVICE_NAME` | No | Default `bluelock-backend` (must match Cloud Run service) |
| `GEMINI_API_KEY` | Yes | Backend Cloud Run env |
| `GOOGLE_MAPS_API_KEY` | No | Routes / traffic |
| `CRICAPI_KEY` / `RAPIDAPI_KEY` | No | Live scores |
| `CORS_ORIGINS` | No | Set automatically by `deploy-firebase-full.*` when unset |

`scripts/render-firebase-config.mjs` writes `.firebase/deploy-firebase.json` with run targets from `.env` so the tracked `firebase.json` is not modified on deploy.

### WebSocket and CORS in production

| Mode | REST | WebSocket |
|------|------|-----------|
| **Firebase Hosting (default)** | Same origin: `/api/v1/...` | `wss://<host>/api/v1/stadium/live-stream` (derived from `window.location` when `VITE_USE_BACKEND=true`) |
| **Cloud Run UI** (`deploy-gcp.*`) | `VITE_API_BASE_URL` → backend URL | `VITE_TELEMETRY_WS_URL` or derived from API base |

- **CORS:** Same-origin Hosting rewrites avoid browser CORS for API calls. `deploy-firebase-full.*` sets backend `CORS_ORIGINS` to your `*.web.app` / `*.firebaseapp.com` origins for direct backend access or tooling.
- **WebSocket:** Firebase Hosting supports WebSocket upgrades to Cloud Run for `run` rewrites. Keep `VITE_TELEMETRY_WS_URL` unset for Firebase builds so the client uses the Hosting host.
- **Bypass Hosting:** If you set `VITE_API_BASE_URL` to the raw Cloud Run URL at build time, configure `CORS_ORIGINS` on the backend to include your frontend origin.

### Custom domain

Add the domain in Firebase Hosting, then include it in backend `CORS_ORIGINS` if clients call the backend URL directly.

## Alternative: two Cloud Run services

Use when you want the UI on Cloud Run nginx instead of Firebase Hosting.

| Service | Default name | Source |
|---------|--------------|--------|
| API | `bluelock-backend` | Root `Dockerfile` |
| UI | `bluelock-frontend` | `frontend/Dockerfile` |

```bash
./scripts/deploy-gcp.sh
```

```powershell
.\scripts\deploy-gcp.ps1
```

Backend-only (e.g. before Firebase Hosting):

```bash
DEPLOY_ONLY=backend ./scripts/deploy-gcp.sh
```

The script builds the frontend with `VITE_API_BASE_URL` and `VITE_TELEMETRY_WS_URL` pointing at the backend Cloud Run URL.

### GCP Cloud Shell (Firebase full stack)

```bash
git clone <your-repo-url> BlueLock && cd BlueLock
cp .env.template .env && cp .firebaserc.example .firebaserc
nano .env   # GCP_PROJECT_ID, GEMINI_API_KEY, etc.
nano .firebaserc   # projects.default
npm install -g firebase-tools
chmod +x scripts/deploy-firebase-full.sh
./scripts/deploy-firebase-full.sh
```

## Static quality gate

```powershell
.\scripts\check-static.ps1
```

```bash
chmod +x scripts/check-static.sh
./scripts/check-static.sh
```

Runs **Ruff**, **Mypy** (backend), **ESLint** (frontend), and **`npm run build:production`**.

## Launcher (local dev)

**Windows:** `.\scripts\launch.ps1`  
**macOS / Linux:** `./scripts/launch.sh`

| Option | Action |
|--------|--------|
| 1 / `local` | Docker backend + frontend dev |
| 2 / `gcp` | Deploy both Cloud Run services (`deploy-gcp.*`) |
| 2b / `firebase` | Full Firebase + backend deploy (`deploy-firebase-full.*`) |
| 3 / `frontend` | Frontend dev only |
| 4 / `backend` | Backend only |
| 5 / `containers` | `docker compose ps` |
| 6 / `health` | Probe `/health` |
| 7 / `build` | Docker build + `npm run build` |

Non-interactive: `.\scripts\launch.ps1 -Action firebase`

## Local integrated stack

`docker-compose.yml` is for **local development only**. Production uses Cloud Run + Firebase Hosting, not compose.

1. `cp backend/.env.template backend/.env` — set `GEMINI_API_KEY`.
2. `cp frontend/.env.example frontend/.env.local` — `VITE_USE_BACKEND=true`.
3. Start backend (`docker compose up` or Uvicorn on port 8000).
4. `cd frontend && npm install && npm run dev`.

## Node.js for frontend builds

Vite 7 requires **Node 20.19+** or **22.12+**. The repo pins **22.12.0** in [`.nvmrc`](../.nvmrc). Deploy scripts call `scripts/ensure-node.*`.

## Environment reference

### Backend (`backend/.env`) — local

| Variable | Required |
|----------|----------|
| `GEMINI_API_KEY` | For AI routes |
| `CORS_ORIGINS` | No (default `*`) |
| `PORT` | Set by Cloud Run (`8080`) |

### Frontend (`frontend/.env.local`) — local

| Variable | Purpose |
|----------|---------|
| `VITE_USE_BACKEND` | `true` → Vite proxy to FastAPI |
| `BACKEND_URL` | Proxy upstream (`http://127.0.0.1:8000`) |

### Frontend (`frontend/.env.production`) — Firebase

- `VITE_USE_BACKEND=true`
- Do **not** set `VITE_API_BASE_URL` or `VITE_TELEMETRY_WS_URL` (same-origin via Hosting)

### Frontend — Cloud Run UI build

Set at build time by `deploy-gcp.*`:

- `VITE_USE_BACKEND=true`
- `VITE_API_BASE_URL` — backend HTTPS URL
- `VITE_TELEMETRY_WS_URL` — `wss://<backend-host>/api/v1/stadium/live-stream`

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| AI returns 503 | Set `GEMINI_API_KEY` in root `.env` |
| API 404 on Hosting domain | Deploy backend; verify `BACKEND_SERVICE_NAME` / `GCP_REGION` match Cloud Run and `firebase.json` run blocks |
| WebSocket fails on Firebase | Do not set `VITE_TELEMETRY_WS_URL` in production build; confirm backend WS route is up |
| CORS errors | Use Firebase same-origin build, or set `CORS_ORIGINS` on backend |
| `firebase` not found | `npm install -g firebase-tools` |
| Blank Hosting site | Run `npm run build:production` (generates `dist/client/index.html`) |
| `gcloud` permission denied | IAM: Cloud Run Admin, Service Account User, Cloud Build Editor |
| Mypy errors in check-static | `pip install -r backend/requirements-dev.txt` |

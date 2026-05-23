# Deployment Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend |
| Node.js | **22.12.0** via `.nvmrc` (min 20.19+ / 22.12+ for Vite 7) | Frontend build (TanStack Start) |
| Bun | optional | Faster frontend installs |
| Docker | optional | Local backend container |
| `firebase-tools` | latest | Firebase Hosting |
| `gcloud` | latest | Cloud Run |

## Static quality gate

Run before opening a PR:

```powershell
.\scripts\check-static.ps1
```

```bash
chmod +x scripts/check-static.sh
./scripts/check-static.sh
```

This runs **Ruff**, **Mypy** (backend), and **`npm run build:firebase`** (frontend).

## Launcher

**Windows:** `.\scripts\launch.ps1`  
**macOS / Linux:** `./scripts/launch.sh`

| Option | Action |
|--------|--------|
| 1 / `local` | Docker backend + frontend dev (falls back to Uvicorn if Docker missing) |
| 2 / `gcp` | Guided Cloud Run + Firebase deploy |
| 3 / `frontend` | Frontend dev only |
| 4 / `backend` | Backend only |
| 5 / `containers` | `docker compose ps` |
| 6 / `health` | Probe `/health` and optional frontend port |
| 7 / `build` | Docker build + `build:firebase` |

Non-interactive: `.\scripts\launch.ps1 -Action health`

## Local integrated stack

1. `cp backend/.env.template backend/.env` — set `GEMINI_API_KEY`.
2. `cp frontend/.env.example frontend/.env.local` — ensure `VITE_USE_BACKEND=true`.
3. Start backend (choose one):
   - `docker compose up -d --build` (maps host **8000** → container **8080**)
   - `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000`
4. `cd frontend && npm install && npm run dev`
5. Open the Vite URL from the terminal (often `http://127.0.0.1:5173`; port is auto-selected).

## Node.js for frontend builds

Vite 7 requires **Node 20.19+** or **22.12+**. The repo pins **22.12.0** in [`.nvmrc`](../.nvmrc) and `frontend/package.json` (`engines` + Volta).

Deploy and CI scripts call `scripts/ensure-node.*`, which checks the active Node version and, when possible, switches via **fnm**, **nvm**, or **Volta** — you should not need to change Node manually.

```powershell
# Windows (fnm example)
fnm install
fnm use
```

```bash
# macOS / Linux
fnm install && fnm use   # or: nvm install && nvm use
```

If no version manager is installed, install Node **22.12.0** from [nodejs.org](https://nodejs.org/) or enable [Volta](https://volta.sh/) (reads `volta` in `frontend/package.json`).

## Firebase Hosting (frontend)

1. `firebase login`
2. `cp .firebaserc.example .firebaserc` — set your Firebase project id.
3. Deploy Cloud Run backend first (below).
4. Deploy hosting (builds `frontend` then uploads `dist/client`):

```powershell
.\scripts\deploy-firebase.ps1 -ProjectId your-firebase-project-id
```

```bash
chmod +x scripts/deploy-firebase.sh scripts/ensure-node.sh
./scripts/deploy-firebase.sh your-firebase-project-id
```

`deploy-firebase.*` runs `ensure-node`, `npm install` (or `bun install`), and `build:firebase`. Production env uses `frontend/.env.production` (`VITE_USE_BACKEND=true`). The post-build step emits `frontend/dist/client/index.html` (required because the TanStack Cloudflare build does not include it).

**Do not** run bare `firebase deploy --only hosting` without building first — use the deploy script or:

```bash
bash scripts/ensure-node.sh
cd frontend && npm install && npm run build:firebase
firebase deploy --only hosting
```

`firebase.json` serves `frontend/dist/client` and rewrites `/api/**` and `/health` to Cloud Run service **`bluelock-backend`** in **`us-central1`**. Update `serviceId` / `region` if your service differs.

**Note:** Full TanStack SSR is supported via Cloudflare (`wrangler`). Firebase Hosting serves the static client bundle plus API rewrites to Cloud Run.

## Google Cloud Run (backend)

```bash
cd backend
gcloud run deploy bluelock-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets=GEMINI_API_KEY=gemini-api-key:latest \
  --port 8080
```

Match the Firebase `serviceId` in `firebase.json` to this service name.

## Environment reference

### Backend (`backend/.env`)

| Variable | Required |
|----------|----------|
| `GEMINI_API_KEY` | For AI routes |
| `CORS_ORIGINS` | No (default `*`) |
| `PORT` | Set by Cloud Run (`8080`) |

### Frontend (`frontend/.env.local`)

| Variable | Purpose |
|----------|---------|
| `VITE_USE_BACKEND` | `true` → proxy to FastAPI |
| `BACKEND_URL` | SSR/proxy upstream (e.g. `http://127.0.0.1:8000`) |
| `USE_BACKEND` | Same as above for server handlers |
| `VITE_API_BASE_URL` | Optional direct Cloud Run URL |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| AI returns 503 | Set `GEMINI_API_KEY` in `backend/.env` |
| CORS errors with direct API URL | Set `CORS_ORIGINS` or use same-origin proxy |
| Vite: Node 20.18.x too old | Run `scripts/ensure-node.ps1` or install Node from `.nvmrc` (22.12.0) |
| Firebase blank page | Run `build:firebase` so `index.html` exists |
| API 502 on Firebase | Deploy Cloud Run; match `serviceId` in `firebase.json` |
| `check-static` Mypy errors | `pip install -r backend/requirements-dev.txt` |

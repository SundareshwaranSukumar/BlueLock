# BlueLock

Smart Stadium & Crowd Dispersal Command Grid — TanStack Start frontend, FastAPI backend, SQLite ticketing, live cricket telemetry (LSG vs PBKS @ Ekana), Gemini concierge.

## Quick start

```powershell
.\scripts\launch.ps1
```

```bash
chmod +x scripts/launch.sh scripts/deploy-firebase.sh scripts/check-static.sh
./scripts/launch.sh
```

1. Copy `backend/.env.template` → `backend/.env` and set `GEMINI_API_KEY` (and optional `CRICAPI_KEY`, `TOMTOM_API_KEY`).
2. Launcher option **1** starts the backend (Docker if available, else Uvicorn) and the frontend dev server.
3. Open the Vite URL from the terminal (port may differ from `5173`).

**Static checks:** `.\scripts\check-static.ps1` (Ruff, Mypy, production frontend build).

## Repository

| Path | Description |
|------|-------------|
| [`frontend/`](./frontend/) | TanStack Start UI |
| [`backend/`](./backend/) | FastAPI command grid API |
| [`docs/`](./docs/) | Architecture, API integration, deployment |
| [`scripts/`](./scripts/) | `launch.*`, `deploy-firebase.*`, `check-static.*` |
| [`firebase.json`](./firebase.json) | Hosting + Cloud Run rewrites |

## Documentation

- [Architecture](docs/architecture.md)
- [API integration](docs/api-integration.md)
- [Deployment](docs/deployment.md)
- [PlantUML diagrams](docs/diagrams/architecture.puml)

## Deploy to Firebase

Deploy the Cloud Run backend first, then:

```powershell
.\scripts\deploy-firebase.ps1 -ProjectId your-firebase-project-id
```

See [docs/deployment.md](docs/deployment.md) for `serviceId`, region, and Node.js version requirements.

## License

Apache 2.0 — see [LICENSE](./LICENSE).

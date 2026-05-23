# Code Quality & Static Analysis

BlueLock follows conventions aligned with the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html) and common TypeScript/React practices.

## Backend (Python)

| Tool | Config | Command |
|------|--------|---------|
| **Ruff** | `backend/pyproject.toml` | `cd backend && python -m ruff check . && python -m ruff format .` |
| **Mypy** | `backend/pyproject.toml` (`strict = true`) | `cd backend && python -m mypy .` |

Practices applied in this codebase:

- Explicit types on public functions and route handlers
- Pydantic validation at API boundaries (`request_utils.validate_model`)
- HTTP `422` for validation errors (not generic `500`)
- Structured logging for unexpected AI failures (`logger.exception`)
- `CORS_ORIGINS` env var instead of hard-coded production origins
- Services own integration logic; routes stay thin

Install dev tools:

```bash
cd backend
pip install -r requirements-dev.txt
```

## Frontend (TypeScript)

| Check | Command |
|-------|---------|
| Production build | `cd frontend && npm run build:production` |
| ESLint | `cd frontend && npm run lint` |
| Prettier | `cd frontend && npm run format` |

`npm run lint` must report **0 errors** (warnings from `react-refresh/only-export-components` in shadcn/ui files are acceptable). Run `npm run format` after UI edits to satisfy `prettier/prettier` rules.

**Node.js:** Use **22.12.0** from repo [`.nvmrc`](../.nvmrc). `check-static.*` runs `ensure-node` before building. `frontend/package.json` sets `engines` and `engine-strict` via `.npmrc`.

## Monorepo gate

```bash
./scripts/check-static.sh
```

```powershell
.\scripts\check-static.ps1
```

Runs Ruff, Mypy, ESLint, and the production frontend build in one pass.

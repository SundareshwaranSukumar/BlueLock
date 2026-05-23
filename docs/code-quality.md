# Code Quality & Static Analysis

BlueLock follows conventions aligned with the [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html) and common TypeScript/React practices.

## Backend (Python)

| Tool | Config | Command |
|------|--------|---------|
| **Ruff** | `backend/pyproject.toml` | `python -m ruff check backend` |
| **Mypy** | `backend/pyproject.toml` (`strict = true`) | `python -m mypy backend` |

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
| Production build | `cd frontend && npm run build:firebase` |
| ESLint | `cd frontend && npm run lint` |

The Lovable-generated UI has Prettier formatting drift in some components; `npm run lint` may report `prettier/prettier` on files outside the integration layer. The integration files (`src/services/api.ts`, `src/lib/*`, `src/routes/api/v1/*`) follow project conventions.

**Node.js:** Use **22.12.0** from repo [`.nvmrc`](../.nvmrc). `check-static.*` runs `ensure-node` before building. `frontend/package.json` sets `engines` and `engine-strict` via `.npmrc`.

## Monorepo gate

```bash
./scripts/check-static.sh
```

Runs Ruff, Mypy, and the Firebase production build in one pass.

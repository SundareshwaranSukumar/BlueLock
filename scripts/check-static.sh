#!/usr/bin/env bash
# Run static analysis and production builds for BlueLock
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Backend: Ruff ==="
cd backend
if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt -r requirements-dev.txt
else
  .venv/bin/pip install -q -r requirements-dev.txt 2>/dev/null || true
fi
.venv/bin/ruff check .
.venv/bin/ruff format --check .
echo "=== Backend: Mypy ==="
.venv/bin/mypy .
cd "$ROOT"

echo "=== Frontend: Production build ==="
cd frontend
if command -v bun >/dev/null 2>&1; then
  bun install
  bun run build:firebase
else
  npm install
  npm run build:firebase
fi

echo "All static checks passed."

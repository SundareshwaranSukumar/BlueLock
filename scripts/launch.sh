#!/usr/bin/env bash
# BlueLock interactive launcher (macOS / Linux)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8000}"
ACTION="${1:-menu}"

menu() {
  echo ""
  echo "BlueLock Launcher"
  echo "  1) Local full stack (Docker backend + frontend dev)"
  echo "  2) Deploy GCP (Cloud Run) — scripts/deploy-gcp.sh"
  echo "  2b) Deploy Firebase (backend + Hosting) — scripts/deploy-firebase-full.sh"
  echo "  3) Frontend only"
  echo "  4) Backend only"
  echo "  5) Validate Docker containers"
  echo "  6) Health status"
  echo "  7) Build all"
  echo "  0) Exit"
  echo ""
}

ensure_backend_env() {
  if [[ ! -f "$BACKEND_DIR/.env" && -f "$BACKEND_DIR/.env.template" ]]; then
    cp "$BACKEND_DIR/.env.template" "$BACKEND_DIR/.env"
    echo "Created backend/.env — set GEMINI_API_KEY for AI routes."
  fi
}

start_backend_docker() {
  ensure_backend_env
  cd "$ROOT"
  docker compose up -d --build backend
  echo "Backend on $BACKEND_URL"
}

start_backend_local() {
  ensure_backend_env
  cd "$BACKEND_DIR"
  if [[ ! -d .venv ]]; then
    python3 -m venv .venv
    .venv/bin/pip install -r requirements.txt
  fi
  .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 &
  echo "Uvicorn PID $!"
}

start_frontend() {
  cd "$FRONTEND_DIR"
  [[ -f .env.local ]] || cp .env.example .env.local
  export VITE_USE_BACKEND=true BACKEND_URL="$BACKEND_URL" USE_BACKEND=true
  if command -v bun >/dev/null 2>&1; then bun install && bun run dev
  else npm install && npm run dev; fi
}

health_check() {
  curl -sf "$BACKEND_URL/health" && echo "" || echo "Backend /health FAILED"
  curl -sf "$BACKEND_URL/api/v1/health" && echo "" || echo "Backend /api/v1/health FAILED"
  curl -sf -o /dev/null "http://127.0.0.1:5173" && echo "Frontend :5173 OK" || echo "Frontend :5173 not running"
}

containers_status() {
  cd "$ROOT"
  docker compose ps
}

build_all() {
  cd "$ROOT"
  docker compose build backend
  cd "$FRONTEND_DIR"
  if command -v bun >/dev/null 2>&1; then bun install && bun run build
  else npm install && npm run build; fi
}

run_action() {
  case "$1" in
    1|local)
      start_backend_docker
      sleep 4
      health_check
      start_frontend
      ;;
    2|gcp)
      bash "$ROOT/scripts/deploy-gcp.sh"
      ;;
    2b|firebase)
      bash "$ROOT/scripts/deploy-firebase-full.sh"
      ;;
    3|frontend) start_frontend ;;
    4|backend)
      if command -v docker >/dev/null 2>&1; then start_backend_docker
      else start_backend_local; fi
      ;;
    5|containers) containers_status ;;
    6|health) health_check ;;
    7|build) build_all ;;
    0) exit 0 ;;
    *) echo "Unknown: $1" ;;
  esac
}

cd "$ROOT"
if [[ "$ACTION" == "menu" ]]; then
  while true; do
    menu
    read -r pick
    [[ "$pick" == "0" ]] && break
    run_action "$pick"
  done
else
  run_action "$ACTION"
fi

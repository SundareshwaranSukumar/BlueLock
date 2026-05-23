#!/usr/bin/env bash
# BlueLock — build static frontend and deploy Firebase Hosting (API via Cloud Run rewrites)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

load_env() {
  if [[ ! -f "$ROOT/.env" ]]; then
    echo "Missing $ROOT/.env — copy .env.template to .env and fill values." >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

ensure_firebaserc() {
  local project="${FIREBASE_PROJECT_ID:-${GCP_PROJECT_ID:-}}"
  if [[ -z "$project" ]]; then
    echo "Set FIREBASE_PROJECT_ID or GCP_PROJECT_ID in .env" >&2
    exit 1
  fi
  if [[ ! -f "$ROOT/.firebaserc" ]]; then
    if [[ -f "$ROOT/.firebaserc.example" ]]; then
      cp "$ROOT/.firebaserc.example" "$ROOT/.firebaserc"
      echo "Created .firebaserc from .firebaserc.example — set projects.default to: $project"
    fi
    if command -v node >/dev/null 2>&1; then
      node -e "
        const fs = require('fs');
        const p = process.argv[1];
        const id = process.argv[2];
        const path = process.argv[3];
        let rc = { projects: { default: id } };
        if (fs.existsSync(path)) {
          rc = JSON.parse(fs.readFileSync(path, 'utf8'));
          rc.projects = rc.projects || {};
          rc.projects.default = id;
        }
        fs.writeFileSync(p, JSON.stringify(rc, null, 2) + '\n');
      " "$ROOT/.firebaserc" "$project" "$ROOT/.firebaserc.example"
    else
      printf '%s\n' "{\"projects\":{\"default\":\"$project\"}}" >"$ROOT/.firebaserc"
    fi
  fi
}

load_env
require_cmd firebase
require_cmd node

ensure_firebaserc

FIREBASE_CONFIG="$(node "$ROOT/scripts/render-firebase-config.mjs")"

echo "=== Node (frontend build) ==="
bash "$ROOT/scripts/ensure-node.sh"

echo "=== Frontend production build (same-origin API via Hosting rewrites) ==="
cd "$ROOT/frontend"
export VITE_USE_BACKEND=true
unset VITE_API_BASE_URL VITE_TELEMETRY_WS_URL
if command -v bun >/dev/null 2>&1; then
  bun install
  bun run build:production
else
  npm install
  npm run build:production
fi

echo "=== Firebase Hosting deploy ==="
cd "$ROOT"
firebase deploy --only hosting --config "$FIREBASE_CONFIG" --project "${FIREBASE_PROJECT_ID:-$GCP_PROJECT_ID}"

echo ""
echo "Firebase Hosting deploy complete."
echo "  Ensure backend Cloud Run service '${BACKEND_SERVICE_NAME:-bluelock-backend}' is deployed in ${GCP_REGION:-us-central1}."
echo "  Full stack: ./scripts/deploy-firebase-full.sh"
echo "  Hosting URL: https://${FIREBASE_PROJECT_ID:-$GCP_PROJECT_ID}.web.app (or custom domain)"

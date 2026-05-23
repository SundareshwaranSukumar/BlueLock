#!/usr/bin/env bash
# BlueLock — deploy backend to Cloud Run, then Firebase Hosting (recommended production path)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

load_env() {
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
}

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Missing $ROOT/.env — copy .env.template to .env" >&2
  exit 1
fi
load_env

PROJECT="${FIREBASE_PROJECT_ID:-${GCP_PROJECT_ID:-}}"
if [[ -z "$PROJECT" ]]; then
  echo "Set FIREBASE_PROJECT_ID or GCP_PROJECT_ID in .env" >&2
  exit 1
fi

# Same-origin Firebase Hosting — CORS not required; set explicit origins if you bypass Hosting.
if [[ -z "${CORS_ORIGINS:-}" ]]; then
  export CORS_ORIGINS="https://${PROJECT}.web.app,https://${PROJECT}.firebaseapp.com"
  echo "CORS_ORIGINS=$CORS_ORIGINS (override in .env to customize)"
fi

echo "=== Step 1/2: Cloud Run backend ==="
DEPLOY_ONLY=backend "$ROOT/scripts/deploy-gcp.sh"

echo ""
echo "=== Step 2/2: Firebase Hosting ==="
"$ROOT/scripts/deploy-firebase.sh"

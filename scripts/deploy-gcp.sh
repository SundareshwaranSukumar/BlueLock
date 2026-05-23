#!/usr/bin/env bash
# BlueLock — deploy backend + frontend to Google Cloud Run
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

backend_env_vars() {
  local vars="GEMINI_API_KEY=${GEMINI_API_KEY:?Set GEMINI_API_KEY in .env}"
  [[ -n "${GOOGLE_MAPS_API_KEY:-}" ]] && vars+=",GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}"
  [[ -n "${CRICAPI_KEY:-}" ]] && vars+=",CRICAPI_KEY=${CRICAPI_KEY}"
  [[ -n "${RAPIDAPI_KEY:-}" ]] && vars+=",RAPIDAPI_KEY=${RAPIDAPI_KEY}"
  [[ -n "${CORS_ORIGINS:-}" ]] && vars+=",CORS_ORIGINS=${CORS_ORIGINS}"
  echo "$vars"
}

https_to_wss() {
  local base="${1%/}"
  if [[ "$base" == https://* ]]; then
    echo "wss://${base#https://}/api/v1/stadium/live-stream"
  elif [[ "$base" == http://* ]]; then
    echo "ws://${base#http://}/api/v1/stadium/live-stream"
  else
    echo "${base}/api/v1/stadium/live-stream"
  fi
}

load_env
require_cmd gcloud

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID in .env}"
GCP_REGION="${GCP_REGION:-us-central1}"
BACKEND_SERVICE_NAME="${BACKEND_SERVICE_NAME:-bluelock-backend}"
FRONTEND_SERVICE_NAME="${FRONTEND_SERVICE_NAME:-bluelock-frontend}"
DEPLOY_ONLY="${DEPLOY_ONLY:-all}"

echo "=== gcloud auth / project ==="
if ! gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q .; then
  echo "No active gcloud account. Run: gcloud auth login" >&2
  exit 1
fi
gcloud config set project "$GCP_PROJECT_ID" >/dev/null

echo "=== Enabling APIs ==="
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project="$GCP_PROJECT_ID"

BACKEND_ENV="$(backend_env_vars)"

echo "=== Deploying backend: $BACKEND_SERVICE_NAME ==="
gcloud run deploy "$BACKEND_SERVICE_NAME" \
  --source "$ROOT" \
  --dockerfile Dockerfile \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "$BACKEND_ENV"

BACKEND_URL="$(gcloud run services describe "$BACKEND_SERVICE_NAME" \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --format='value(status.url)')"
BACKEND_URL="${BACKEND_URL%/}"

echo "Backend URL: $BACKEND_URL"

if [[ "$DEPLOY_ONLY" == "backend" ]]; then
  echo ""
  echo "Backend deploy complete (DEPLOY_ONLY=backend)."
  echo "  Next: ./scripts/deploy-firebase.sh or ./scripts/deploy-firebase-full.sh"
  exit 0
fi

VITE_API_BASE_URL="${VITE_API_BASE_URL:-$BACKEND_URL}"
VITE_TELEMETRY_WS_URL="${VITE_TELEMETRY_WS_URL:-$(https_to_wss "$VITE_API_BASE_URL")}"

echo "Frontend build: VITE_API_BASE_URL=$VITE_API_BASE_URL"
echo "Frontend build: VITE_TELEMETRY_WS_URL=$VITE_TELEMETRY_WS_URL"

echo "=== Deploying frontend: $FRONTEND_SERVICE_NAME ==="
gcloud run deploy "$FRONTEND_SERVICE_NAME" \
  --source "$ROOT" \
  --dockerfile frontend/Dockerfile \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --allow-unauthenticated \
  --port 8080 \
  --build-env-vars "VITE_API_BASE_URL=${VITE_API_BASE_URL},VITE_USE_BACKEND=true,VITE_TELEMETRY_WS_URL=${VITE_TELEMETRY_WS_URL}"

FRONTEND_URL="$(gcloud run services describe "$FRONTEND_SERVICE_NAME" \
  --region "$GCP_REGION" \
  --project "$GCP_PROJECT_ID" \
  --format='value(status.url)')"

echo ""
echo "Deploy complete."
echo "  Backend:  $BACKEND_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""
echo "Open the frontend URL in your browser. API calls go to the backend Cloud Run service."
echo "For Firebase Hosting instead: ./scripts/deploy-firebase-full.sh"

#!/usr/bin/env bash
# BlueLock — build frontend and deploy to Firebase Hosting
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT_ID="${1:-}"

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install: npm install -g firebase-tools" >&2
  exit 1
fi

if [[ -n "$PROJECT_ID" ]]; then
  echo "{\"projects\":{\"default\":\"$PROJECT_ID\"}}" > .firebaserc
fi

if [[ ! -f .firebaserc ]]; then
  echo "Missing .firebaserc. Copy .firebaserc.example or pass project id." >&2
  exit 1
fi

echo "Building frontend..."
cd frontend
if command -v bun >/dev/null 2>&1; then
  bun install
  export VITE_USE_BACKEND=true
  bun run build:firebase
else
  npm install
  export VITE_USE_BACKEND=true
  npm run build:firebase
fi
cd "$ROOT"

CLIENT_DIR="$ROOT/frontend/dist/client"
if [[ ! -d "$CLIENT_DIR" ]]; then
  echo "Build output not found at $CLIENT_DIR" >&2
  exit 1
fi

echo "Deploying to Firebase Hosting..."
firebase deploy --only hosting
echo "Done."

#!/usr/bin/env bash
# Activate Node from .nvmrc when fnm/nvm/Volta is available; then verify Vite engine.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NVMRC="$ROOT/.nvmrc"

if [[ ! -f "$NVMRC" ]]; then
  echo "Missing $NVMRC" >&2
  exit 1
fi

REQUIRED="$(tr -d 'v \r\n' < "$NVMRC")"

if node "$ROOT/scripts/ensure-node.mjs" --quiet 2>/dev/null; then
  exit 0
fi

echo "Node version below Vite minimum; trying fnm / nvm / Volta..." >&2

if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env --shell bash 2>/dev/null || fnm env)"
  fnm install "$REQUIRED" --silent-if-installed 2>/dev/null || fnm install "$REQUIRED"
  fnm use "$REQUIRED"
elif [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm install "$REQUIRED" 2>/dev/null || true
  nvm use "$REQUIRED"
elif command -v volta >/dev/null 2>&1; then
  volta install "node@$REQUIRED"
else
  echo "No fnm, nvm, or Volta found. Install Node $REQUIRED manually." >&2
fi

exec node "$ROOT/scripts/ensure-node.mjs"

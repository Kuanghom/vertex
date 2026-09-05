#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEBUI_DIR="${PROJECT_ROOT}/webui"

cd "${WEBUI_DIR}"

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  echo "[build-webui] Using local Node.js $(node -v)"
  npm install --no-audit --no-fund --legacy-peer-deps
  npm run build
  exit 0
fi

echo "[build-webui] Using node:16-bullseye container (npm 8, compatible with lockfile)"
docker run --rm \
  -v "${PROJECT_ROOT}:/workspace" \
  -w /workspace/webui \
  node:16-bullseye \
  bash -lc '
    set -e
    npm install -g npm@8
    rm -rf node_modules
    npm ci --legacy-peer-deps
    npm run build
  '

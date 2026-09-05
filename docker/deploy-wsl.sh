#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-vertex:local}"
CONTAINER_NAME="${CONTAINER_NAME:-vertex}"
HOST_PORT="${HOST_PORT:-3000}"
SKIP_WEBUI=0
SKIP_IMAGE=0
NO_CACHE=0

usage() {
  cat <<'EOF'
Usage: deploy-wsl.sh [options]

Options:
  --skip-webui     Skip frontend build
  --skip-image     Skip docker image build (restart container only)
  --no-cache       Build docker image without cache
  --port <port>    Host port, default 3000
  --name <name>    Container name, default vertex
  --image <tag>    Image tag, default vertex:local
  -h, --help       Show help
EOF
}

log() {
  printf '[deploy] %s\n' "$*"
}

fail() {
  printf '[deploy][error] %s\n' "$*" >&2
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DATA_DIR="${PROJECT_ROOT}/.vertex-data"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-webui) SKIP_WEBUI=1; shift ;;
    --skip-image) SKIP_IMAGE=1; shift ;;
    --no-cache) NO_CACHE=1; shift ;;
    --port) HOST_PORT="${2:-}"; shift 2 ;;
    --name) CONTAINER_NAME="${2:-}"; shift 2 ;;
    --image) IMAGE_NAME="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown option: $1" ;;
  esac
done

[[ "${HOST_PORT}" =~ ^[0-9]+$ ]] || fail "Invalid port: ${HOST_PORT}"

command -v docker >/dev/null 2>&1 || fail "Docker not found in WSL. Install Docker Desktop or docker engine first."

if ! docker info >/dev/null 2>&1; then
  fail "Docker daemon is not running. Start Docker Desktop or the docker service."
fi

build_webui() {
  log "Building frontend to app/static ..."
  bash "${SCRIPT_DIR}/build-webui.sh"
  [[ -f "${PROJECT_ROOT}/app/static/index.html" ]] || fail "Frontend build failed: app/static/index.html not found."
}

build_image() {
  log "Pulling base image lswl/vertex-base:latest ..."
  docker pull lswl/vertex-base:latest || log "Warning: failed to pull base image, using local cache if available."

  local build_args=()
  if [[ "${NO_CACHE}" -eq 1 ]]; then
    build_args+=(--no-cache)
  fi

  log "Building image ${IMAGE_NAME} ..."
  docker build "${build_args[@]}" \
    -f "${PROJECT_ROOT}/docker/Dockerfile" \
    -t "${IMAGE_NAME}" \
    "${PROJECT_ROOT}"
}

restart_container() {
  mkdir -p "${DATA_DIR}"

  if docker ps -a --format '{{.Names}}' | grep -Fxq "${CONTAINER_NAME}"; then
    log "Removing existing container ${CONTAINER_NAME} ..."
    docker rm -f "${CONTAINER_NAME}" >/dev/null
  fi

  log "Starting container ${CONTAINER_NAME} on port ${HOST_PORT} ..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "${HOST_PORT}:3000" \
    -v "${DATA_DIR}:/vertex" \
    -e TZ=Asia/Shanghai \
    -e PORT=3000 \
    -e REDISPORT=6379 \
    "${IMAGE_NAME}" >/dev/null

  log "Waiting for service to become ready ..."
  local i
  for i in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${HOST_PORT}/user/login" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
}

print_summary() {
  cat <<EOF

========================================
 Vertex deployed successfully
========================================
 URL:       http://localhost:${HOST_PORT}
 Data dir:  ${DATA_DIR}
 Container: ${CONTAINER_NAME}
 Image:     ${IMAGE_NAME}

 First login:
   If this is a fresh install, check initial password:
   ${DATA_DIR}/data/password

 Useful commands:
   docker logs -f ${CONTAINER_NAME}
   docker stop ${CONTAINER_NAME}
   docker start ${CONTAINER_NAME}

 U2 RSS page:
   http://localhost:${HOST_PORT}/task/u2Rss
========================================
EOF
}

cd "${PROJECT_ROOT}"

if [[ "${SKIP_WEBUI}" -eq 0 ]]; then
  build_webui
else
  log "Skip frontend build (--skip-webui)."
  [[ -f "${PROJECT_ROOT}/app/static/index.html" ]] || fail "app/static/index.html not found. Run without --skip-webui first."
fi

if [[ "${SKIP_IMAGE}" -eq 0 ]]; then
  build_image
else
  log "Skip image build (--skip-image)."
  docker image inspect "${IMAGE_NAME}" >/dev/null 2>&1 || fail "Image ${IMAGE_NAME} not found."
fi

restart_container
print_summary

#!/usr/bin/env bash
# Setup and deploy ZXA isolated agent runtime on Linux / server environments.
set -euo pipefail

SKIP_WEB_BUILD=false
SKIP_IMAGE_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --skip-web-build|--skip-web)
      SKIP_WEB_BUILD=true
      ;;
    --skip-image-build|--skip-image)
      SKIP_IMAGE_BUILD=true
      ;;
    -h|--help)
      echo "Usage: ./setup-zxa.sh [--skip-web-build] [--skip-image-build]"
      exit 0
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/compose.json"
RUNTIME_URL="http://127.0.0.1:4230"

echo "🚀 Setting up ZXA isolated runtime at $RUNTIME_URL..."

# 1. Prerequisite checks
command -v docker >/dev/null 2>&1 || { echo "❌ Error: docker is required but not installed." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ Error: npm is required but not installed." >&2; exit 1; }

cd "$REPO_ROOT"

# 2. Web client build
if [ "$SKIP_WEB_BUILD" = false ]; then
  echo "📦 Building @codexsun/zxa-web..."
  npm run build -w @codexsun/zxa-web
fi

# 3. Docker Compose Build & Deploy
COMPOSE_ARGS=("compose" "-f" "$COMPOSE_FILE" "up" "-d" "--force-recreate" "--wait")
if [ "$SKIP_IMAGE_BUILD" = false ]; then
  COMPOSE_ARGS+=("--build")
fi

echo "🐳 Deploying ZXA container with compose..."
docker "${COMPOSE_ARGS[@]}"

# 4. Health and UI verification
echo "🔍 Verifying ZXA runtime health..."
HEALTH_OK=false
for i in {1..10}; do
  if curl -s -f "$RUNTIME_URL/health" >/dev/null 2>&1; then
    HEALTH_OK=true
    break
  fi
  sleep 2
done

if [ "$HEALTH_OK" = false ]; then
  echo "❌ Error: ZXA healthcheck did not report ready within 20 seconds." >&2
  exit 1
fi

PAGE_CONTENT=$(curl -s "$RUNTIME_URL/" || true)
if [[ "$PAGE_CONTENT" != *"ZXA"* ]]; then
  echo "❌ Error: ZXA web interface did not return the expected connection page." >&2
  exit 1
fi

echo ""
echo "✨ ZXA is ready and healthy at $RUNTIME_URL/"
echo "🌐 Open $RUNTIME_URL/ in your browser to manage connections or run:"
echo "   npm run zxa:cli -- status"
echo "   npm run zxa:cli -- connect gemini <API_KEY>"
echo "   npm run zxa:cli -- test gemini"
echo ""

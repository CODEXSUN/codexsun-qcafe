#!/usr/bin/env bash
# Runs on the VPS. It stages an archive, preserves private runtime data, and keeps a rollback image tag.
set -Eeuo pipefail

APP_ROOT="${CODEXSUN_ROOT:-/home/codexsun-os}"
ARCHIVE="${1:?Usage: apply-vps.sh /path/to/codexsun-cloud-source.tgz}"
COMPOSE_FILE="$APP_ROOT/deploy/compose.json"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$APP_ROOT/.deploy-runs/$STAMP"
STAGE_DIR="$RUN_DIR/source"
LOG_FILE="$RUN_DIR/deploy.log"
LOCK_FILE="$APP_ROOT/.deploy.lock"
ROLLBACK_TAG="codexsun-os/api:rollback-$STAMP"

mkdir -p "$RUN_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

fail() {
  local status=$?
  echo "Deployment stopped at line $1 with status $status."
  echo "Checkpoint log: $LOG_FILE"
  exit "$status"
}
trap 'fail $LINENO' ERR

if ! mkdir "$LOCK_FILE" 2>/dev/null; then
  echo "Another deployment is active: $LOCK_FILE"
  exit 2
fi
trap 'rmdir "$LOCK_FILE"' EXIT

[[ -f "$ARCHIVE" ]] || { echo "Archive not found: $ARCHIVE"; exit 2; }
[[ -f "$COMPOSE_FILE" ]] || { echo "Compose file not found: $COMPOSE_FILE"; exit 2; }
tar -tzf "$ARCHIVE" >/dev/null
mkdir -p "$STAGE_DIR"
tar -xzf "$ARCHIVE" -C "$STAGE_DIR"
[[ -f "$STAGE_DIR/deploy/compose.json" ]] || { echo "Archive does not contain deploy/compose.json"; exit 2; }

echo "Checkpoint: archive validated and staged."
if docker image inspect codexsun-os/api:0.1.13 >/dev/null 2>&1; then
  docker tag codexsun-os/api:0.1.13 "$ROLLBACK_TAG"
fi

# Runtime state is ignored by the source archive. Merge only owned source paths;
# do not delete any existing path during a deployment.
for path in apps packages tools assist deploy package.json package-lock.json tsconfig.base.json .dockerignore; do
  [[ -e "$STAGE_DIR/$path" ]] || continue
  mkdir -p "$(dirname "$APP_ROOT/$path")"
  if [[ -d "$STAGE_DIR/$path" ]]; then
    mkdir -p "$APP_ROOT/$path"
    cp -a "$STAGE_DIR/$path/." "$APP_ROOT/$path/"
  else
    cp -a "$STAGE_DIR/$path" "$APP_ROOT/$path"
  fi
done

mkdir -p "$APP_ROOT/deploy/config" "$APP_ROOT/deploy/state" "$APP_ROOT/deploy/portal"
python3 "$APP_ROOT/deploy/bootstrap-vps.py"
docker compose -f "$COMPOSE_FILE" config -q
echo "Checkpoint: source activated and configuration validated."

cd "$APP_ROOT"
docker compose -f "$COMPOSE_FILE" build platform dcs
docker compose -f "$COMPOSE_FILE" up -d --wait platform chat zetro dcs files zxa
docker compose -f "$COMPOSE_FILE" up -d --force-recreate --no-deps web
docker compose -f "$COMPOSE_FILE" ps
echo "Deployment complete. Log: $LOG_FILE"

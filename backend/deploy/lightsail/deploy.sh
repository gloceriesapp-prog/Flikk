#!/usr/bin/env bash
# Run from a staged releases/<commit> directory. Secrets stay in APP_DIR/.env.
set -euo pipefail
umask 077
APP_DIR=${APP_DIR:-/opt/gloceries}
TAG=${1:?usage: deploy.sh <40-character commit>}
[[ "$TAG" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid release commit'; exit 2; }
RELEASE="$APP_DIR/releases/$TAG"
[[ -d "$RELEASE" && -s "$APP_DIR/.env" ]] || { echo 'Release files or production environment missing'; exit 2; }
exec 9>"$APP_DIR/.deploy.lock"
flock -n 9 || { echo 'Another deployment is running'; exit 2; }
export TAG
ln -sfn "$APP_DIR/.env" "$RELEASE/.env"
previous=$(readlink -f "$APP_DIR/current" 2>/dev/null || true)
compose() { docker compose --project-name gloceries --project-directory "$RELEASE" -f "$RELEASE/docker-compose.yml" "$@"; }
# Pull everything before replacing either running process. No database migrations
# run here: schema changes must be backward compatible and approved separately.
compose config --quiet
compose pull
if ! compose up -d --wait --wait-timeout 180; then
  echo 'Release failed readiness checks; restoring the previous release'
  if [[ -n "$previous" && -f "$previous/docker-compose.yml" ]]; then
    export TAG=${previous##*/}
    docker compose --project-name gloceries --project-directory "$previous" -f "$previous/docker-compose.yml" up -d --wait --wait-timeout 180 || {
      echo 'Rollback failed: operator intervention required'; exit 1;
    }
  else
    compose down
  fi
  exit 1
fi
ln -sfn "$RELEASE" "$APP_DIR/.current-next"
mv -Tf "$APP_DIR/.current-next" "$APP_DIR/current"
printf 'Release %s: API and worker ready\n' "$TAG"

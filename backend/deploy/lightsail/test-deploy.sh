#!/usr/bin/env bash
# Exercises success, failed pull and failed readiness without Docker or secrets.
set -euo pipefail
script_dir=$(cd -- "$(dirname -- "$0")" && pwd)
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
export APP_DIR="$scratch/app" DEPLOY_LOG="$scratch/log"
mkdir -p "$scratch/bin" "$APP_DIR/releases"
export PATH="$scratch/bin:$PATH"
cat > "$scratch/bin/docker" <<'MOCK'
#!/usr/bin/env bash
printf '%s %s\n' "$TAG" "$*" >> "$DEPLOY_LOG"
if [[ "$*" == *' pull'* && ${FAIL_PULL:-0} == 1 ]]; then exit 1; fi
if [[ "$*" == *' up '* && "$TAG" == "${FAIL_TAG:-none}" ]]; then exit 1; fi
MOCK
chmod +x "$scratch/bin/docker"
touch "$APP_DIR/.env"
printf '# test environment\n' > "$APP_DIR/.env"
old=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
new=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
bad=cccccccccccccccccccccccccccccccccccccccc
for tag in "$old" "$new" "$bad"; do
  mkdir -p "$APP_DIR/releases/$tag"
  touch "$APP_DIR/releases/$tag/docker-compose.yml"
done
ln -s "$APP_DIR/releases/$old" "$APP_DIR/current"
bash "$script_dir/deploy.sh" "$new"
[[ $(readlink "$APP_DIR/current") == "$APP_DIR/releases/$new" ]]
: > "$DEPLOY_LOG"
if FAIL_TAG="$bad" bash "$script_dir/deploy.sh" "$bad"; then echo 'Expected failed readiness'; exit 1; fi
[[ $(readlink "$APP_DIR/current") == "$APP_DIR/releases/$new" ]]
grep -q "$new .* up -d --wait" "$DEPLOY_LOG"
: > "$DEPLOY_LOG"
if FAIL_PULL=1 bash "$script_dir/deploy.sh" "$bad"; then echo 'Expected failed pull'; exit 1; fi
if grep -q ' up ' "$DEPLOY_LOG"; then echo 'Changed containers after failed pull'; exit 1; fi
if bash "$script_dir/deploy.sh" latest; then echo 'Mutable tag accepted'; exit 1; fi
rm "$APP_DIR/current"
if FAIL_TAG="$bad" bash "$script_dir/deploy.sh" "$bad"; then echo 'Expected first deployment failure'; exit 1; fi
grep -q "$bad .* down" "$DEPLOY_LOG"
echo 'Deployment recovery checks passed'

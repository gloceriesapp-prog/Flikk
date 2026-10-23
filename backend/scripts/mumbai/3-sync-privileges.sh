#!/usr/bin/env bash
# Gives gloceries-mumbai exactly Seoul's privileges for anon, authenticated,
# service_role and PUBLIC (tables, columns, sequences, functions, default
# privileges) in public and ops. Seoul is only read; Mumbai changes in one
# transaction. Safe to re-run. 1-copy-database.sh already runs this; use it on
# its own for a database copied before that step existed.
#
#   export OLD_DB_URL='<Seoul session pooler URL>' NEW_DB_URL='<Mumbai session pooler URL>'
#   bash backend/scripts/mumbai/3-sync-privileges.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
: "${OLD_DB_URL:?export OLD_DB_URL (Seoul session pooler URL) first}"
: "${NEW_DB_URL:?export NEW_DB_URL (Mumbai session pooler URL) first}"
case "$OLD_DB_URL" in *bjlknohjdnemxwwoxcsv*) ;; *) echo "OLD_DB_URL is not the Seoul project."; exit 1 ;; esac
case "$NEW_DB_URL" in *cdnfpaolzkpqetmmpyzh*) ;; *) echo "NEW_DB_URL is not gloceries-mumbai."; exit 1 ;; esac

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "== Reading Seoul's privileges"
psql "$OLD_DB_URL" -XAt -f "$HERE/privileges.sql" > "$WORK/grants.sql"
echo "$(wc -l < "$WORK/grants.sql" | tr -d ' ') statements"

echo "== Applying them to Mumbai (one transaction)"
psql "$NEW_DB_URL" -Xq -v ON_ERROR_STOP=1 --single-transaction -f "$WORK/grants.sql"

echo "== Comparing"
fingerprint() { psql "$1" -XAt -f "$HERE/verify.sql" | grep '^privileges|'; }
old=$(fingerprint "$OLD_DB_URL"); new=$(fingerprint "$NEW_DB_URL")
if [ "$old" = "$new" ]; then
  echo "Privileges verified: $new"
else
  echo "Privileges still differ (left = Seoul, right = Mumbai):"
  echo "  $old"
  echo "  $new"
  exit 1
fi

#!/usr/bin/env bash
# Copies the whole Flikk database (Seoul, bjlknohjdnemxwwoxcsv) into the empty
# gloceries-mumbai project (cdnfpaolzkpqetmmpyzh): schema (tables,
# functions, triggers, policies, grants, views, publications, the ops schema)
# and every row, including auth users and storage metadata. This is Supabase's
# documented CLI dump/restore. Storage FILES are copied by 2-copy-storage.mjs.
#
# Seoul is only read. Mumbai must be empty; the restore is one transaction, so
# a failure leaves Mumbai empty again and the script can simply be re-run.
#
# Needs: Supabase CLI (or npx) + Docker running (the CLI runs pg_dump in Docker),
# and psql 17 (brew install libpq && brew link --force libpq).
# Connection strings: each project's Connect button → Session pooler. Export
# them in your terminal (never paste them into chat or commit them):
#   export OLD_DB_URL='postgresql://postgres.bjlknohjdnemxwwoxcsv:...@...:5432/postgres'
#   export NEW_DB_URL='postgresql://postgres.cdnfpaolzkpqetmmpyzh:...@...:5432/postgres'
#   bash backend/scripts/mumbai/1-copy-database.sh
set -euo pipefail

OLD_REF=bjlknohjdnemxwwoxcsv
NEW_REF=cdnfpaolzkpqetmmpyzh
HERE="$(cd "$(dirname "$0")" && pwd)"

: "${OLD_DB_URL:?export OLD_DB_URL (Seoul session pooler URL) first}"
: "${NEW_DB_URL:?export NEW_DB_URL (Mumbai session pooler URL) first}"
case "$OLD_DB_URL" in *"$OLD_REF"*) ;; *) echo "OLD_DB_URL is not the Seoul project ($OLD_REF)."; exit 1 ;; esac
case "$NEW_DB_URL" in *"$NEW_REF"*) ;; *) echo "NEW_DB_URL is not gloceries-mumbai ($NEW_REF)."; exit 1 ;; esac

if command -v supabase >/dev/null 2>&1; then SUPABASE=(supabase); else SUPABASE=(npx -y supabase@latest); fi
command -v psql >/dev/null || { echo "psql not found (brew install libpq && brew link --force libpq)."; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is not running; start Docker Desktop (the Supabase CLI uses it for pg_dump)."; exit 1; }

echo "== Checking Mumbai is empty"
existing=$(psql "$NEW_DB_URL" -XAtc "select count(*) from information_schema.tables where table_schema in ('public','ops')")
if [ "$existing" != "0" ]; then
  echo "Mumbai already has $existing tables in public/ops. Refusing to overwrite."
  echo "If an earlier attempt half-finished outside a transaction, reset the project in the dashboard first."
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT   # the dumps hold personal data: never keep them

echo "== Checking roles"
# Every Supabase project ships the same built-in roles, already configured
# (re-running their CREATE/ALTER ROLE needs superuser and aborts the restore).
# Only roles WE added would need copying; Flikk has none, so stop if that
# ever changes instead of silently dropping one.
role_sql="select rolname from pg_roles where rolname !~ '^pg_'"
missing=$(LC_ALL=C comm -23 <(psql "$OLD_DB_URL" -XAtc "$role_sql" | LC_ALL=C sort) <(psql "$NEW_DB_URL" -XAtc "$role_sql" | LC_ALL=C sort))
if [ -n "$missing" ]; then
  echo "Seoul has roles Mumbai lacks; create them in Mumbai first, then re-run:"
  echo "$missing"
  exit 1
fi

echo "== Dumping Seoul (read-only)"
"${SUPABASE[@]}" db dump --db-url "$OLD_DB_URL" -f "$WORK/schema.sql"
"${SUPABASE[@]}" db dump --db-url "$OLD_DB_URL" -f "$WORK/data.sql" --use-copy --data-only

# The CLI dump leaves out the storage schema, so our policies on
# storage.objects (migration 094: private documents service-only, no direct
# writes to media buckets) are rebuilt from Seoul's catalogue.
psql "$OLD_DB_URL" -XAt -c "
  select format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
    policyname, schemaname, tablename, permissive, cmd,
    (select string_agg(case when r = 'public' then 'PUBLIC' else quote_ident(r) end, ',') from unnest(roles) r),
    coalesce(' USING (' || qual || ')', ''), coalesce(' WITH CHECK (' || with_check || ')', ''))
  from pg_policies where schemaname = 'storage' order by policyname" > "$WORK/storage-policies.sql"

# Drop COPY blocks that must not or need not be loaded:
#  - empty tables: some are Supabase-internal ones our role may not write
#    (storage.buckets_vectors: permission denied), and empty needs no load;
#  - realtime.subscription: live websocket subscriptions of the old project;
#  - supabase_migrations: the CLI's history (this repo tracks ops.applied_migrations).
# verify.sql still compares every public/ops table afterwards.
awk 'function flush() { if (held != "") print held; held = "" }
     skipping { if ($0 == "\\.") skipping = 0; next }
     /^COPY "(realtime"\."subscription|supabase_migrations"\.)/ { skipping = 1; dropped++; next }
     /^COPY .* FROM stdin;$/ { held = $0; next }
     held != "" { if ($0 == "\\.") { held = ""; dropped++; next } flush() }
     { print }
     END { print "-- left out " dropped + 0 " tables (empty or not app data)" > "/dev/stderr" }' \
  "$WORK/data.sql" > "$WORK/data-rows.sql"

echo "== Restoring into Mumbai (one transaction, triggers paused while rows load)"
psql -X -v ON_ERROR_STOP=1 --single-transaction \
  --file "$WORK/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$WORK/data-rows.sql" \
  --file "$WORK/storage-policies.sql" \
  --dbname "$NEW_DB_URL"

echo "== Migration ledger (ops.applied_migrations)"
# The CLI dump may leave out the custom ops schema; copy it explicitly if so.
if [ "$(psql "$NEW_DB_URL" -XAtc "select to_regclass('ops.applied_migrations') is not null")" != "t" ]; then
  psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 -c "
    CREATE SCHEMA IF NOT EXISTS ops;
    REVOKE ALL ON SCHEMA ops FROM PUBLIC;
    CREATE TABLE ops.applied_migrations (
      file text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now(),
      baselined boolean NOT NULL DEFAULT false);"
  psql "$OLD_DB_URL" -XAc "\copy ops.applied_migrations to stdout" \
    | psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 -c "\copy ops.applied_migrations from stdin"
fi

echo "== Comparing every table (row counts + content hashes)"
psql "$OLD_DB_URL" -XAt -f "$HERE/verify.sql" > "$WORK/old.txt"
psql "$NEW_DB_URL" -XAt -f "$HERE/verify.sql" > "$WORK/new.txt"
# Storage file counts only match after 2-copy-storage.mjs; leave them out here.
if diff <(grep -v '^bucket:' "$WORK/old.txt") <(grep -v '^bucket:' "$WORK/new.txt"); then
  echo "Database copy verified: $(grep -vc '^bucket:' "$WORK/new.txt") tables identical."
else
  echo "Differences above (left = Seoul, right = Mumbai). Volatile auth tables show '-' for content."
  exit 1
fi
echo "Next: node backend/scripts/mumbai/2-copy-storage.mjs"

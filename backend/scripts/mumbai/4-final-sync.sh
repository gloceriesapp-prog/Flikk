#!/usr/bin/env bash
# Final catch-up at the switch: brings into gloceries-mumbai whatever was
# written to Seoul (Flikk) after the copy, then proves the two match.
#
# Order at the switch:
#   1. Stop BOTH Railway services (API and worker) so nothing writes to Seoul.
#   2. Run this (Seoul is only read):
#        export OLD_DB_URL='<Seoul session pooler URL>' NEW_DB_URL='<Mumbai session pooler URL>'
#        SEOUL_STOPPED=yes bash backend/scripts/mumbai/4-final-sync.sh
#   3. Point the backend and admin at Mumbai and start them.
#
# How it decides what to copy: seoul-at-copy.txt is Seoul's fingerprint
# (verify.sql) taken when Mumbai was copied. Only tables whose fingerprint has
# changed since then are synced, Seoul's rows winning (upsert by primary key,
# rows gone from Seoul removed), so Mumbai's own changes elsewhere (image URLs
# moved to Mumbai, the content revisions that bumped) are kept. Everything
# runs in one transaction with triggers paused; a failure changes nothing.
set -euo pipefail

OLD_REF=bjlknohjdnemxwwoxcsv
NEW_REF=cdnfpaolzkpqetmmpyzh
HERE="$(cd "$(dirname "$0")" && pwd)"

: "${OLD_DB_URL:?export OLD_DB_URL (Seoul session pooler URL) first}"
: "${NEW_DB_URL:?export NEW_DB_URL (Mumbai session pooler URL) first}"
case "$OLD_DB_URL" in *"$OLD_REF"*) ;; *) echo "OLD_DB_URL is not the Seoul project ($OLD_REF)."; exit 1 ;; esac
case "$NEW_DB_URL" in *"$NEW_REF"*) ;; *) echo "NEW_DB_URL is not gloceries-mumbai ($NEW_REF)."; exit 1 ;; esac
command -v psql >/dev/null || { echo "psql not found (brew install libpq && brew link --force libpq)."; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT   # exported rows hold personal data: never keep them
old() { psql "$OLD_DB_URL" -XAt "$@"; }
new() { psql "$NEW_DB_URL" -XAt "$@"; }
fingerprint() { psql "$1" -XAt -f "$HERE/verify.sql" | LC_ALL=C sort; }

echo "== 1. Is Seoul frozen?"
idle=$(old -c "select coalesce(extract(epoch from now() - max(last_success_at))::int, 999999)
               from public.scheduled_work where interval_seconds <= 60")
if [ "$idle" -lt 120 ]; then
  echo "Seoul's worker finished a job ${idle}s ago, so it is still running."
  echo "Stop BOTH Railway services (API and worker), wait 2 minutes, then re-run."
  exit 1
fi
if [ "${SEOUL_STOPPED:-}" != yes ]; then
  echo "The worker is stopped. Make sure the Railway API is stopped too (no order or"
  echo "sign-up can reach Seoul), then re-run with SEOUL_STOPPED=yes."
  exit 1
fi

echo "== 2. What changed in Seoul since the copy"
fingerprint "$OLD_DB_URL" > "$WORK/seoul-now.txt"
LC_ALL=C sort "$HERE/seoul-at-copy.txt" > "$WORK/seoul-then.txt"
LC_ALL=C comm -13 "$WORK/seoul-then.txt" "$WORK/seoul-now.txt" | cut -d'|' -f1 | LC_ALL=C sort -u > "$WORK/changed.txt"

# Schema changes (a migration run on Seoul) are not data: apply them to Mumbai
# with db-migrate.mjs first instead of copying rows around them.
if grep -qxE 'policies|privileges|ops\.applied_migrations' "$WORK/changed.txt"; then
  echo "Seoul's schema changed since the copy (a migration, policy or grant). Apply the"
  echo "same migration(s) to Mumbai first:"
  echo "  DATABASE_URL=\"\$NEW_DB_URL\" CONFIRM_PRODUCTION=$NEW_REF node backend/scripts/db-migrate.mjs --production"
  echo "then re-run this script."
  exit 1
fi

tables=$(grep -E '^(public|auth)\.' "$WORK/changed.txt" || true)
storage_changed=$(grep -E '^(storage\.|bucket:)' "$WORK/changed.txt" || true)

if [ -z "$tables" ]; then
  echo "No table changed in Seoul since the copy: Mumbai already has every row."
else
  echo "Changed since the copy:"; echo "$tables" | sed 's/^/  /'
  echo "== 3. Syncing those tables into Mumbai (one transaction, triggers paused)"
  sync="$WORK/sync.sql"
  echo "SET session_replication_role = replica;" > "$sync"
  for qualified in $tables; do
    schema=${qualified%%.*}; table=${qualified#*.}; stage="stage_${schema}_${table}"
    rel="$schema.$table"
    # Columns Seoul has (generated ones are computed, never written).
    cols=$(old -c "select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
                   from information_schema.columns
                   where table_schema = '$schema' and table_name = '$table' and is_generated = 'NEVER'")
    pk=$(new -c "select string_agg(quote_ident(a.attname), ', ' order by array_position(i.indkey::int2[], a.attnum))
                 from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
                 where i.indrelid = '$rel'::regclass and i.indisprimary")
    old -c "\\copy (select $cols from $rel) to '$WORK/$stage.copy'"
    {
      echo "CREATE TEMP TABLE $stage ON COMMIT DROP AS SELECT $cols FROM $rel WITH NO DATA;"
      echo "\\copy $stage ($cols) from '$WORK/$stage.copy'"
      if [ -n "$pk" ]; then
        match=$(echo "$pk" | tr -d ' ' | tr ',' '\n' | sed 's/.*/s.& = t.&/' | paste -sd' ' - | sed 's/ s\./ AND s./g')
        set_list=$(old -c "select string_agg(format('%1\$I = excluded.%1\$I', column_name), ', ' order by ordinal_position)
                           from information_schema.columns
                           where table_schema = '$schema' and table_name = '$table' and is_generated = 'NEVER'
                             and quote_ident(column_name) <> all (string_to_array('$(echo "$pk" | tr -d ' ')', ','))")
        echo "DELETE FROM $rel t WHERE NOT EXISTS (SELECT 1 FROM $stage s WHERE $match);"
        if [ -n "$set_list" ]; then
          echo "INSERT INTO $rel ($cols) SELECT $cols FROM $stage ON CONFLICT ($pk) DO UPDATE SET $set_list;"
        else
          echo "INSERT INTO $rel ($cols) SELECT $cols FROM $stage ON CONFLICT ($pk) DO NOTHING;"
        fi
      else
        echo "DELETE FROM $rel;"
        echo "INSERT INTO $rel ($cols) SELECT $cols FROM $stage;"
      fi
      # Rows that came from Seoul may carry Seoul storage URLs: point them at Mumbai.
      new -c "select format('UPDATE %s SET %I = replace(%I::text, %L, %L)::%s WHERE %I::text LIKE %L;',
                            '$rel', attname, attname, '$OLD_REF', '$NEW_REF', format_type(atttypid, atttypmod), attname, '%$OLD_REF%')
              from pg_attribute
              where attrelid = '$rel'::regclass and attnum > 0 and not attisdropped and attgenerated = ''
                and atttypid in ('text'::regtype, 'varchar'::regtype, 'json'::regtype, 'jsonb'::regtype)"
    } >> "$sync"
  done
  # Never let a sequence hand out a number Seoul already used.
  old -c "select format('SELECT setval(%L, greatest(%s, (SELECT last_value FROM %I.%I)));',
                        quote_ident(schemaname) || '.' || quote_ident(sequencename), last_value, schemaname, sequencename)
          from pg_sequences where schemaname in ('public', 'ops') and last_value is not null" >> "$sync"
  psql "$NEW_DB_URL" -Xq -v ON_ERROR_STOP=1 --single-transaction -f "$sync"
fi

echo "== 4. Comparing Seoul and Mumbai"
fingerprint "$OLD_DB_URL" | grep -vE '^(storage\.|bucket:)' > "$WORK/old.txt"
fingerprint "$NEW_DB_URL" | grep -vE '^(storage\.|bucket:)' > "$WORK/new.txt"
# Mumbai's own edits since the copy: moving image URLs to Mumbai bumped these
# content revisions and audit rows. A table synced above must match exactly.
expected='^public\.(home_content|home_content_history)$'
LC_ALL=C comm -3 "$WORK/old.txt" "$WORK/new.txt" | tr -d '\t' | cut -d'|' -f1 | LC_ALL=C sort -u > "$WORK/differ.txt"
unexpected=$(grep -vE "$expected" "$WORK/differ.txt" || true)
for qualified in $tables; do
  grep -qx "$qualified" "$WORK/differ.txt" && unexpected="$unexpected $qualified"
done
if [ -n "${unexpected// /}" ]; then
  echo "Still different (left = Seoul, right = Mumbai):"
  for t in $unexpected; do grep "^$t|" "$WORK/old.txt" "$WORK/new.txt" | sed 's/^/  /'; done
  exit 1
fi
echo "Mumbai matches Seoul on every table and on schema, policies and privileges."
[ -s "$WORK/differ.txt" ] && echo "(Expected Mumbai-only edits: $(paste -sd' ' "$WORK/differ.txt"))"

if [ -n "$storage_changed" ]; then
  echo "Storage changed in Seoul since the copy. Copy the new files (safe to repeat):"
  echo "  node backend/scripts/mumbai/2-copy-storage.mjs"
fi
echo "Mumbai is ready to take production traffic."

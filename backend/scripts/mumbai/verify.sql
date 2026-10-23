-- Fingerprint of a Gloceries database for the Seoul → Mumbai copy. Read-only.
-- Run it on both projects; every line must match:
--   psql "$OLD_DB_URL" -XAt -f verify.sql > old.txt
--   psql "$NEW_DB_URL" -XAt -f verify.sql > new.txt && diff old.txt new.txt
--
-- public.* and ops.*: row count + md5 of every full row (sorted), so any
-- difference in any column shows up.
-- auth / storage: Supabase owns these schemas and a newer project can carry
-- extra columns, so they are compared on the columns that matter to the apps
-- (identity, phone/email, password hash, ban, provider; bucket settings; file
-- paths). Sessions and refresh tokens are not copied state and are left out.
with app_tables as (
  select table_schema as s, table_name as t
  from information_schema.tables
  where table_type = 'BASE TABLE' and table_schema in ('public', 'ops')
    -- job leases: the running worker rewrites next_run_at every few seconds
    and (table_schema, table_name) <> ('public', 'scheduled_work')
)
select format('%s.%s|%s|%s', s, t,
  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', s, t), false, true, '')))[1]::text,
  coalesce((xpath('/row/h/text()', query_to_xml(
    format('select md5(string_agg(x::text, %L order by x::text)) as h from %I.%I x', E'\n', s, t),
    false, true, '')))[1]::text, 'empty'))
from app_tables
union all
select format('public.scheduled_work|%s|%s', count(*), md5(string_agg(
  concat_ws('|', name, interval_seconds, catch_up), E'\n' order by name)))
from public.scheduled_work
union all
select format('policies|%s|%s', count(*), md5(string_agg(
  concat_ws('|', schemaname, tablename, policyname, permissive, cmd, roles::text, qual, with_check),
  E'\n' order by schemaname, tablename, policyname)))
from pg_policies
union all
select format('auth.users|%s|%s', count(*), coalesce(md5(string_agg(
  concat_ws('|', id, phone, email, encrypted_password, phone_confirmed_at is not null,
            email_confirmed_at is not null, banned_until, role, is_sso_user, deleted_at),
  E'\n' order by id)), 'empty'))
from auth.users
union all
select format('auth.identities|%s|%s', count(*), coalesce(md5(string_agg(
  concat_ws('|', user_id, provider, provider_id), E'\n' order by user_id, provider, provider_id)), 'empty'))
from auth.identities
union all
select format('storage.buckets|%s|%s', count(*), coalesce(md5(string_agg(
  concat_ws('|', id, name, public, file_size_limit, allowed_mime_types::text), E'\n' order by id)), 'empty'))
from storage.buckets
union all
select format('storage.objects|%s|%s', count(*), coalesce(md5(string_agg(
  concat_ws('|', bucket_id, name), E'\n' order by bucket_id, name)), 'empty'))
from storage.objects
union all
select format('bucket:%s|%s|%s', b.id, b.public, (select count(*) from storage.objects o where o.bucket_id = b.id))
from storage.buckets b
order by 1;

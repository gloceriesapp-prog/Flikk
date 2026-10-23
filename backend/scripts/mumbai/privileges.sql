-- Prints the statements that give a database exactly Seoul's privileges for
-- the API roles (anon, authenticated, service_role, PUBLIC) on everything in
-- public and ops: tables, views, sequences, columns, functions, and postgres's
-- default privileges for future objects. Read-only; run it on SEOUL:
--   psql "$OLD_DB_URL" -XAt -f privileges.sql > grants.sql
--   psql "$NEW_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f grants.sql
--
-- Why: a newer Supabase project's default privileges grant anon and
-- authenticated everything on new tables and EXECUTE on new functions. The
-- schema dump only re-applies grants relative to Postgres' built-in defaults,
-- so the revocations our migrations made in Seoul were lost in the copy.
select stmt from (
with api_role(name) as (values ('anon'), ('authenticated'), ('service_role')),
rel as (
  select c.oid, c.relkind, c.relowner, c.relacl,
         format('%I.%I', n.nspname, c.relname) as qname,
         case when c.relkind = 'S' then 'SEQUENCE' else 'TABLE' end as kind
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'ops') and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
),
fn as (
  select p.oid, p.proowner, p.proacl,
         format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) as sig,
         case when p.prokind = 'p' then 'PROCEDURE' else 'FUNCTION' end as kind
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'ops') and p.prokind in ('f', 'p')
),
grantee_name as (
  select 0::oid as oid, 'PUBLIC' as name
  union all select r.oid, quote_ident(r.rolname) from pg_roles r join api_role a on a.name = r.rolname
)
-- 1. tables, views, sequences
select 1 as step, format('REVOKE ALL ON %s %s FROM PUBLIC, anon, authenticated, service_role;', kind, qname)
from rel
union all
-- 2. column-level grants (revoked first so no extra column grant survives)
select 2 as step, format('GRANT %s ON %s %s TO %s%s;', a.privilege_type, r.kind, r.qname, g.name,
              case when a.is_grantable then ' WITH GRANT OPTION' else '' end)
from rel r
cross join lateral aclexplode(coalesce(r.relacl, acldefault((case when r.relkind = 'S' then 's' else 'r' end)::"char", r.relowner))) a
join grantee_name g on g.oid = a.grantee
union all
select 3 as step, format('REVOKE ALL (%s) ON TABLE %s FROM PUBLIC, anon, authenticated, service_role;',
              string_agg(quote_ident(att.attname), ', ' order by att.attnum), r.qname)
from rel r join pg_attribute att on att.attrelid = r.oid and att.attnum > 0 and not att.attisdropped
where r.relkind <> 'S'
group by r.qname
union all
-- 3. functions and procedures
select 4 as step, format('GRANT %s (%I) ON TABLE %s TO %s;', a.privilege_type, att.attname, r.qname, g.name)
from rel r
join pg_attribute att on att.attrelid = r.oid and att.attnum > 0 and not att.attisdropped and att.attacl is not null
cross join lateral aclexplode(att.attacl) a
join grantee_name g on g.oid = a.grantee
union all
select 5 as step, format('REVOKE ALL ON %s %s FROM PUBLIC, anon, authenticated, service_role;', kind, sig)
from fn
union all
-- 4. postgres's default privileges in public/ops (what future migrations get)
select 6 as step, format('GRANT EXECUTE ON %s %s TO %s;', f.kind, f.sig, g.name)
from fn f
cross join lateral aclexplode(coalesce(f.proacl, acldefault('f'::"char", f.proowner))) a
join grantee_name g on g.oid = a.grantee
union all
select 7 as step, format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I REVOKE ALL ON %s FROM PUBLIC, anon, authenticated, service_role;',
              s.nspname, t.word)
from pg_namespace s
cross join (values ('r', 'TABLES'), ('S', 'SEQUENCES'), ('f', 'FUNCTIONS')) t(code, word)
where s.nspname in ('public', 'ops')
union all
select 8 as step, format('ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA %I GRANT %s ON %s TO %s;',
              d.defaclnamespace::regnamespace, a.privilege_type,
              case d.defaclobjtype when 'r' then 'TABLES' when 'S' then 'SEQUENCES' else 'FUNCTIONS' end, g.name)
from pg_default_acl d
cross join lateral aclexplode(d.defaclacl) a
join grantee_name g on g.oid = a.grantee
where d.defaclrole = 'postgres'::regrole
  and d.defaclnamespace::regnamespace::text in ('public', 'ops')
  and d.defaclobjtype in ('r', 'S', 'f')
) generated(step, stmt)
order by step, stmt;

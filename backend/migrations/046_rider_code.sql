-- Every rider gets a stable, human-facing ID ("GL078456") shown in the rider
-- app profile and the admin rider page. Postgres owns uniqueness: a sequence
-- feeds the column default, so two concurrent approvals can never collide and
-- there's no app-level generate-check-retry loop to get wrong. GL = the
-- package namespace (com.gloceries.rider); 6-digit zero-padded. Seq starts at
-- 78456 so the first real codes read like an established fleet, not GL000001.
create sequence if not exists rider_code_seq start with 78456;

-- Volatile default (nextval) => adding the column evaluates it per existing
-- row, so old riders are backfilled with distinct codes in this same step.
alter table riders
  add column if not exists rider_code text unique
  default ('GL' || lpad(nextval('rider_code_seq')::text, 6, '0'));

-- Belt-and-suspenders for any row a re-run left null; then lock it NOT NULL.
update riders set rider_code = 'GL' || lpad(nextval('rider_code_seq')::text, 6, '0') where rider_code is null;
alter table riders alter column rider_code set not null;

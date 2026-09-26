-- Reconcile the fragmented identity for a single phone number that ended up
-- as two separate users rows in two different formats/roles — one
-- `+917975247012` (customer), one `917975247012` (store_owner) — before
-- backend/src/lib/phone.ts made `+91XXXXXXXXXX` the one canonical form on
-- every write. A code fix can't merge rows that already exist; this does.
--
-- What it guarantees: the ONE Supabase Auth identity that owns this phone
-- (auth.users.phone is unique, so the OTP login always resolves to it) ends
-- up as an approved store_owner that owns the store, and any stray
-- duplicate row for the same number stops shadowing it. Data-driven — reads
-- the ids out of the tables, nothing hardcoded but the 10-digit number
-- itself. Idempotent: safe to run more than once.
--
-- DESTRUCTIVE NOTE: this demotes and renames the phone on the stray
-- duplicate row (so it stops colliding on users.phone's UNIQUE index) and
-- repoints that store/draft onto the login identity. It does NOT delete any
-- row and does NOT touch orders — a customer order history on the login
-- identity stays intact.
do $$
declare
  target_local text := '7975247012';   -- the 10-digit number being reconciled
  login_id  uuid;                       -- auth identity the OTP resolves to
  owner_id  uuid;                       -- current store_owner row, if separate
begin
  -- The single auth user holding this phone in any format. auth.users.phone
  -- is unique, so the OTP login always lands on exactly this identity.
  select id into login_id
    from auth.users
   where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = target_local
   order by created_at
   limit 1;

  if login_id is null then
    raise notice 'reconcile %: no auth user, nothing to do', target_local;
    return;
  end if;

  -- Make sure a public.users row exists for the login identity.
  insert into public.users (id, phone, role)
       values (login_id, '+91' || target_local, 'store_owner')
  on conflict (id) do nothing;

  -- A store_owner row for this number sitting on a DIFFERENT id: hand its
  -- store + application over to the login identity before we free its phone.
  select id into owner_id
    from public.users
   where id <> login_id
     and role = 'store_owner'
     and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = target_local
   limit 1;

  if owner_id is not null then
    if not exists (select 1 from stores where owner_user_id = login_id) then
      update stores set owner_user_id = login_id where owner_user_id = owner_id;
    end if;
    if exists (select 1 from store_onboarding_drafts where user_id = login_id) then
      delete from store_onboarding_drafts where user_id = owner_id;
    else
      update store_onboarding_drafts set user_id = login_id where user_id = owner_id;
    end if;
  end if;

  -- Free the canonical phone from EVERY other row for this number (the stray
  -- customer/orphan row shadowing the real one, any moved store_owner) so
  -- users.phone's UNIQUE index lets the login identity hold it. Non-owner
  -- rows keep their history, just lose the duplicated number.
  update public.users
     set phone = phone || '__merged_' || left(id::text, 8)
   where id <> login_id
     and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = target_local;

  -- Promote + canonicalize the login identity itself.
  update public.users
     set role        = 'store_owner',
         is_approved = true,
         is_rejected = false,
         phone       = '+91' || target_local
   where id = login_id;

  raise notice 'reconcile %: login_id=% owner_id=% done', target_local, login_id, owner_id;
end $$;

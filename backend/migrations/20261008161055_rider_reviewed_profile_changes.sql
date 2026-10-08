BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Approved identities remain unchanged until a reviewed request is committed.
alter table public.riders add column if not exists zone_id uuid references public.zones(id);
-- A single-zone launch has an unambiguous assignment; multi-zone deployments must assign explicitly.
update public.riders set zone_id=(select id from public.zones where is_active limit 1)
where zone_id is null and (select count(*) from public.zones where is_active)=1;
create table public.rider_profile_change_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id),
 changes jsonb not null check(jsonb_typeof(changes)='object'),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 submitted_at timestamptz not null default now(),
 reviewed_at timestamptz, reviewed_by uuid references auth.users(id), review_note text
);
alter table public.rider_profile_change_requests enable row level security;
revoke all on public.rider_profile_change_requests from public, anon, authenticated;
grant all on public.rider_profile_change_requests to service_role;
create unique index rider_one_pending_profile_change on public.rider_profile_change_requests(user_id) where status='pending';
create index rider_profile_change_latest on public.rider_profile_change_requests(user_id,submitted_at desc);
create index rider_profile_change_review_queue on public.rider_profile_change_requests(submitted_at,id) where status='pending';
create function public.submit_rider_profile_change(p_user_id uuid,p_changes jsonb) returns uuid
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid; v_vehicle text; v_field text; v_path text;
begin
 if p_user_id is null or p_changes is null or jsonb_typeof(p_changes)<>'object' then raise exception 'Invalid rider changes'; end if;
 select vehicle_type into v_vehicle from public.riders where user_id=p_user_id for update;
 if not found then raise exception 'Rider not found'; end if;
 if not exists(select 1 from public.users where id=p_user_id and role='rider' and is_approved and not is_rejected) then raise exception 'Approved rider required'; end if;
 if exists(select 1 from public.rider_profile_change_requests where user_id=p_user_id and status='pending') then raise exception 'A change request is already awaiting review'; end if;
 if p_changes='{}'::jsonb or exists(select 1 from jsonb_object_keys(p_changes) k where k not in ('aadhaar_photo_url','dl_photo_url','dl_number','vehicle_type','vehicle_number')) then raise exception 'Invalid rider changes'; end if;
 if exists(select 1 from jsonb_each(p_changes) where jsonb_typeof(value)<>'string' and not (key='vehicle_number' and value='null'::jsonb)) then raise exception 'Invalid change values'; end if;
 if p_changes ? 'dl_number' and (length(trim(p_changes->>'dl_number'))<1 or length(p_changes->>'dl_number')>30) then raise exception 'Invalid licence number'; end if;
 if p_changes ? 'vehicle_type' and p_changes->>'vehicle_type' not in ('bicycle','scooter','motorcycle') then raise exception 'Invalid vehicle'; end if;
 if p_changes ? 'vehicle_type' or p_changes ? 'vehicle_number' then
  if coalesce(p_changes->>'vehicle_type',v_vehicle) <> 'bicycle' and length(trim(coalesce(p_changes->>'vehicle_number',''))) not between 1 and 20 then raise exception 'Vehicle registration required'; end if;
 end if;
 foreach v_field in array array['aadhaar_photo_url','dl_photo_url'] loop
  if p_changes ? v_field then
   v_path:=p_changes->>v_field;
   if length(v_path)>200 or v_path not like (p_user_id::text || '/' || (case when v_field='aadhaar_photo_url' then 'aadhaar-' else 'dl-' end) || '%')
    or not exists(select 1 from public.media_assets where object_key=v_path and uploaded_by=p_user_id and bucket='rider-documents' and visibility='private' and status='ready') then raise exception 'Owned private document required'; end if;
  end if;
 end loop;
 insert into public.rider_profile_change_requests(user_id,changes) values(p_user_id,p_changes) returning id into v_id;
 return v_id;
end $$;
create function public.review_rider_profile_change(p_id uuid,p_approve boolean,p_reviewer uuid,p_note text) returns text
language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_request public.rider_profile_change_requests; v_user uuid;
begin
 select user_id into v_user from public.rider_profile_change_requests where id=p_id;
 if not found then raise exception 'Request not found'; end if;
 perform 1 from public.riders where user_id=v_user for update;
 select * into v_request from public.rider_profile_change_requests where id=p_id for update;
 if v_request.status<>'pending' then
  if v_request.status=(case when p_approve then 'approved' else 'rejected' end) then return v_request.status; end if;
  raise exception 'This request has already received a different decision';
 end if;
 if p_approve is null or p_reviewer is null or length(coalesce(p_note,''))>500 then raise exception 'Invalid review'; end if;
 if not p_approve and length(trim(coalesce(p_note,'')))<3 then raise exception 'A rejection reason is required'; end if;
 if p_approve then
 update public.riders set
 aadhaar_photo_url=coalesce(v_request.changes->>'aadhaar_photo_url',aadhaar_photo_url),
 dl_photo_url=coalesce(v_request.changes->>'dl_photo_url',dl_photo_url),
 dl_number=coalesce(v_request.changes->>'dl_number',dl_number),
 vehicle_type=coalesce(v_request.changes->>'vehicle_type',vehicle_type),
 vehicle_number=case when v_request.changes ? 'vehicle_number' then v_request.changes->>'vehicle_number' else vehicle_number end
 where user_id=v_user;
 end if;
 update public.rider_profile_change_requests set status=case when p_approve then 'approved' else 'rejected' end,
 reviewed_at=now(),reviewed_by=p_reviewer,review_note=nullif(trim(p_note),'') where id=p_id;
 return case when p_approve then 'approved' else 'rejected' end;
end $$;
revoke all on function public.submit_rider_profile_change(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.review_rider_profile_change(uuid,boolean,uuid,text) from public,anon,authenticated;
grant execute on function public.submit_rider_profile_change(uuid,jsonb) to service_role;
grant execute on function public.review_rider_profile_change(uuid,boolean,uuid,text) to service_role;

COMMIT;

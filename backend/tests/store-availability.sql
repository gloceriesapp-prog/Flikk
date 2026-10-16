DO $$
DECLARE s public.stores; r public.stores; outsider uuid; at_time timestamptz:=statement_timestamp(); boundary timestamptz;
BEGIN
  ASSERT store_schedule_open('09:00','21:00','2026-10-16 03:30:00Z'), 'opens at 9 IST';
  ASSERT NOT store_schedule_open('09:00','21:00','2026-10-16 03:29:59Z'), 'closed before 9 IST';
  ASSERT NOT store_schedule_open('09:00','21:00','2026-10-16 15:30:00Z'), 'closes at 21 IST';
  ASSERT store_schedule_open('21:00','02:00','2026-10-16 18:00:00Z'), 'overnight open';
  ASSERT NOT store_schedule_open('21:00','02:00','2026-10-16 20:30:00Z'), 'overnight close';
  ASSERT store_schedule_open('00:00','00:00',at_time), 'equal hours mean 24h';
  ASSERT store_schedule_open(NULL,NULL,at_time), 'no hours preserves always open default';
  ASSERT NOT store_schedule_open('09:00',NULL,at_time), 'partial schedule fails closed';
  ASSERT store_next_hours_boundary('09:00','21:00','2026-10-16 03:30:00Z')='2026-10-16 15:30:00Z', 'strict next boundary';
  ASSERT store_next_hours_boundary('21:00','02:00','2026-10-16 18:00:00Z')='2026-10-16 20:30:00Z', 'overnight boundary';
  ASSERT NOT has_function_privilege('anon','public.partner_set_store_availability(uuid,uuid,boolean)','EXECUTE'), 'anon denied';
  ASSERT NOT has_function_privilege('authenticated','public.sync_store_availability(integer)','EXECUTE'), 'clients cannot run worker';
  SELECT * INTO s FROM stores WHERE owner_user_id IS NOT NULL ORDER BY id LIMIT 1 FOR UPDATE;
  ASSERT s.id IS NOT NULL, 'seed store required';
  UPDATE users SET is_approved=true,partner_suspended=false WHERE id=s.owner_user_id;
  UPDATE stores SET admin_suspended=false,open_time='09:00',close_time='21:00' WHERE id=s.id;
  r:=partner_set_store_availability(s.id,s.owner_user_id,true);
  ASSERT r.is_active AND r.availability_override IS TRUE, 'manual open persisted';
  ASSERT r.availability_override_until=store_next_hours_boundary('09:00','21:00',at_time), 'bounded manual duration';
  boundary:=r.availability_override_until;
  ASSERT store_effective_open(r,boundary)=store_schedule_open('09:00','21:00',boundary), 'expiry resumes automatic hours exactly';
  r:=partner_set_store_availability(s.id,s.owner_user_id,false);
  ASSERT NOT r.is_active AND r.availability_override IS FALSE, 'manual closure persisted';
  r:=partner_set_store_availability(s.id,s.owner_user_id,NULL);
  ASSERT r.availability_override IS NULL AND r.availability_override_until IS NULL, 'resume clears override';
  ASSERT r.is_active=store_schedule_open('09:00','21:00',at_time), 'automatic state uses IST';
  UPDATE stores SET lat=13,lng=74,delivery_radius_km=12 WHERE id=s.id;
  r:=partner_set_store_availability(s.id,s.owner_user_id,false);
  ASSERT EXISTS(SELECT 1 FROM nearby_browsable_stores(13,74,s.zone_id,20,NULL) b WHERE b.store->>'id'=s.id::text), 'closed store catalogue remains discoverable';
  BEGIN
    PERFORM partner_set_store_availability(s.id,gen_random_uuid(),true);
    RAISE EXCEPTION 'Unrelated user could change store';
  EXCEPTION WHEN SQLSTATE 'P0403' THEN NULL; END;
  UPDATE stores SET admin_suspended=true WHERE id=s.id RETURNING * INTO r;
  ASSERT NOT EXISTS(SELECT 1 FROM nearby_browsable_stores(13,74,s.zone_id,20,NULL) b WHERE b.store->>'id'=s.id::text), 'suspended store excluded from coverage';
  ASSERT NOT r.is_active AND NOT store_effective_open(r,at_time), 'suspension takes precedence';
  BEGIN
    PERFORM partner_set_store_availability(s.id,s.owner_user_id,true);
    RAISE EXCEPTION 'Suspended store reopened';
  EXCEPTION WHEN SQLSTATE 'P0409' THEN NULL; END;
  ASSERT NOT store_effective_open(r,'2026-10-16 06:00:00Z'), 'checkout cannot bypass suspension during hours';
  UPDATE stores SET admin_suspended=false WHERE id=s.id;
  -- Create a stale due-row fixture while the table is transaction-locked.
  -- Restore the trigger before testing the real worker. The harness rolls
  -- back these DDL/data changes; no other transaction sees this fixture.
  ALTER TABLE public.stores DISABLE TRIGGER stores_apply_availability;
  UPDATE stores SET open_time='00:00',close_time='00:00',is_active=false,
    availability_override=false,availability_override_until='2001-01-01Z',availability_next_change_at='2000-01-01Z'
    WHERE id=s.id;
  ALTER TABLE public.stores ENABLE TRIGGER stores_apply_availability;
  ASSERT sync_store_availability(1)=1, 'worker drains bounded due batch';
  SELECT * INTO r FROM stores WHERE id=s.id;
  ASSERT r.is_active AND r.availability_override IS NULL AND r.availability_next_change_at IS NULL, 'worker expires override and opens automatically';
  RAISE NOTICE 'Scheduled availability boundaries, overrides, suspension, permissions and worker checks passed';
END $$;

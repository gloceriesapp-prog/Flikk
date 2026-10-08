\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','admin_set_rider_suspension(uuid,boolean,text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','admin_set_rider_suspension(uuid,boolean,text,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Account control RPC exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','admin_set_rider_suspension(uuid,boolean,text,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Admin cannot use account control RPCs'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000110a0','Controls zone','controls-zone');
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000000110e1','+919999911001','rider',true),
 ('00000000-0000-4000-8000-0000000110e2','+919999911002','rider',true);
INSERT INTO riders(id,user_id,name,phone,status,current_lat,current_lng,last_location_update) VALUES
 ('00000000-0000-4000-8000-0000000110f1','00000000-0000-4000-8000-0000000110e1','Rider one','+919999911001','online',12.9716,77.5946,now()),
 ('00000000-0000-4000-8000-0000000110f2','00000000-0000-4000-8000-0000000110e2','Rider two','+919999911002','online',12.9720,77.5950,now());
SET LOCAL session_replication_role=origin;

-- 1. Rider suspension: offline, no pushes, cannot come back online.
DO $$ DECLARE r riders; BEGIN
 IF (SELECT count(*) FROM nearby_online_riders(12.9750,77.5980,3000)
     WHERE rider_user_id IN('00000000-0000-4000-8000-0000000110e1','00000000-0000-4000-8000-0000000110e2'))<>2 THEN
  RAISE EXCEPTION 'Fixture riders not nearby'; END IF;
 BEGIN
  PERFORM admin_set_rider_suspension('00000000-0000-4000-8000-0000000110f1',true,'  ',null);
  RAISE EXCEPTION 'Suspension without reason accepted';
 EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;
 r:=admin_set_rider_suspension('00000000-0000-4000-8000-0000000110f1',true,'No-shows',null);
 IF r.is_active OR r.status<>'offline' OR r.suspended_reason<>'No-shows' OR r.suspended_at IS NULL THEN
  RAISE EXCEPTION 'Suspension did not deactivate and take rider offline'; END IF;
 -- Even if presence were forced back online behind the guard, the push
 -- lookup must skip an inactive rider.
 SET LOCAL session_replication_role=replica;
 UPDATE riders SET status='online' WHERE id='00000000-0000-4000-8000-0000000110f1';
 SET LOCAL session_replication_role=origin;
 IF EXISTS(SELECT 1 FROM nearby_online_riders(12.9750,77.5980,3000) WHERE rider_user_id='00000000-0000-4000-8000-0000000110e1') THEN
  RAISE EXCEPTION 'Suspended rider still receives pickup pushes'; END IF;
 IF NOT EXISTS(SELECT 1 FROM nearby_online_riders(12.9750,77.5980,3000) WHERE rider_user_id='00000000-0000-4000-8000-0000000110e2') THEN
  RAISE EXCEPTION 'Active rider dropped from pickup pushes'; END IF;
 UPDATE riders SET status='offline' WHERE id='00000000-0000-4000-8000-0000000110f1';
 BEGIN
  UPDATE riders SET status='online' WHERE id='00000000-0000-4000-8000-0000000110f1';
  RAISE EXCEPTION 'Suspended rider went online';
 EXCEPTION WHEN sqlstate 'P0403' THEN NULL; END;
 r:=admin_set_rider_suspension('00000000-0000-4000-8000-0000000110f1',false,null,null);
 IF NOT r.is_active OR r.suspended_reason IS NOT NULL THEN RAISE EXCEPTION 'Reactivation failed'; END IF;
 UPDATE riders SET status='online' WHERE id='00000000-0000-4000-8000-0000000110f1';
 BEGIN
  PERFORM admin_set_rider_suspension('00000000-0000-4000-8000-0000000110ff',true,'Missing',null);
  RAISE EXCEPTION 'Unknown rider accepted';
 EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
END $$;

-- 2. Customer blocks: ban is read from auth.users, history is service-only.
DO $$ BEGIN
 IF has_function_privilege('anon','auth_account_blocked(uuid)','EXECUTE') OR has_function_privilege('authenticated','auth_account_blocked(uuid)','EXECUTE')
 OR has_table_privilege('anon','customer_blocks','SELECT') OR has_table_privilege('authenticated','customer_blocks','SELECT') THEN
  RAISE EXCEPTION 'Customer block data exposed to API roles'; END IF;
 INSERT INTO auth.users(id,phone) VALUES('00000000-0000-4000-8000-0000000110c1','+919999911101');
 INSERT INTO users(id,phone,role) VALUES('00000000-0000-4000-8000-0000000110c1','+919999911101','customer');
 IF auth_account_blocked('00000000-0000-4000-8000-0000000110c1') THEN RAISE EXCEPTION 'Unbanned customer reported blocked'; END IF;
 UPDATE auth.users SET banned_until=now()+interval '1 day' WHERE id='00000000-0000-4000-8000-0000000110c1';
 IF NOT auth_account_blocked('00000000-0000-4000-8000-0000000110c1') THEN RAISE EXCEPTION 'Banned customer not reported blocked'; END IF;
 IF (SELECT session_valid FROM request_auth_context_v2('00000000-0000-4000-8000-0000000110c1',gen_random_uuid())) THEN
  RAISE EXCEPTION 'Banned customer keeps a valid session'; END IF;
 UPDATE auth.users SET banned_until=now()-interval '1 minute' WHERE id='00000000-0000-4000-8000-0000000110c1';
 IF auth_account_blocked('00000000-0000-4000-8000-0000000110c1') THEN RAISE EXCEPTION 'Expired ban still blocks'; END IF;
 INSERT INTO customer_blocks(user_id,reason) VALUES('00000000-0000-4000-8000-0000000110c1','Chargeback abuse');
 BEGIN
  INSERT INTO customer_blocks(user_id,reason) VALUES('00000000-0000-4000-8000-0000000110c1',' ');
  RAISE EXCEPTION 'Block without reason accepted';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

ROLLBACK;
SELECT 'Account controls verified' AS result;

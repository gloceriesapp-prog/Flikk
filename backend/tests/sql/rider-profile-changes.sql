\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','submit_rider_profile_change(uuid,jsonb)','EXECUTE')
 OR has_function_privilege('authenticated','submit_rider_profile_change(uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon','review_rider_profile_change(uuid,boolean,uuid,text)','EXECUTE')
 OR has_function_privilege('authenticated','review_rider_profile_change(uuid,boolean,uuid,text)','EXECUTE')
 OR has_table_privilege('authenticated','rider_profile_change_requests','SELECT')
 OR has_table_privilege('authenticated','rider_profile_change_requests','INSERT')
 THEN RAISE EXCEPTION 'Private rider review access exposed'; END IF;
 IF NOT has_function_privilege('service_role','review_rider_profile_change(uuid,boolean,uuid,text)','EXECUTE')
 THEN RAISE EXCEPTION 'Review service cannot execute'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.rider_profile_change_requests'::regclass)
 THEN RAISE EXCEPTION 'Rider reviews need RLS'; END IF;
END $$;
SET LOCAL session_replication_role=replica;
INSERT INTO auth.users(id,phone) VALUES('00000000-0000-4000-8000-000000009591','+919999959001');
INSERT INTO users(id,phone,role,is_approved) VALUES('00000000-0000-4000-8000-000000009591','+919999959001','rider',true);
INSERT INTO riders(user_id,name,phone,status,vehicle_type,vehicle_number,dl_number)
 VALUES('00000000-0000-4000-8000-000000009591','Review rider','+919999959001','offline','scooter','OLD 1234','OLD LICENCE');
SET LOCAL session_replication_role=origin;
DO $$ DECLARE request_id uuid; rider_user uuid:='00000000-0000-4000-8000-000000009591'; result text;
BEGIN
 request_id:=submit_rider_profile_change(rider_user,'{"vehicle_type":"motorcycle","vehicle_number":"NEW 5678","dl_number":"NEW LICENCE"}');
 IF (SELECT vehicle_number FROM riders WHERE user_id=rider_user)<>'OLD 1234' THEN RAISE EXCEPTION 'Pending change overwrote approval'; END IF;
 BEGIN
  PERFORM submit_rider_profile_change(rider_user,'{"dl_number":"DUPLICATE"}');
  RAISE EXCEPTION 'Duplicate request accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Duplicate request accepted' THEN RAISE; END IF;
 END;
 result:=review_rider_profile_change(request_id,true,rider_user,'Verified documents');
 IF result<>'approved' OR (SELECT vehicle_number FROM riders WHERE user_id=rider_user)<>'NEW 5678'
 OR (SELECT dl_number FROM riders WHERE user_id=rider_user)<>'NEW LICENCE' THEN RAISE EXCEPTION 'Approved change was not applied'; END IF;
 IF review_rider_profile_change(request_id,true,rider_user,'Verified documents')<>'approved' THEN RAISE EXCEPTION 'Same review was not idempotent'; END IF;
 BEGIN
  PERFORM review_rider_profile_change(request_id,false,rider_user,'Late rejection');
  RAISE EXCEPTION 'Contradictory review accepted';
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='Contradictory review accepted' THEN RAISE; END IF;
 END;
 request_id:=submit_rider_profile_change(rider_user,'{"dl_number":"REJECTED LICENCE"}');
 result:=review_rider_profile_change(request_id,false,rider_user,'Unreadable scan');
 IF result<>'rejected' OR (SELECT dl_number FROM riders WHERE user_id=rider_user)<>'NEW LICENCE' THEN RAISE EXCEPTION 'Rejection changed approved details'; END IF;
END $$;
ROLLBACK;

\set ON_ERROR_STOP on
-- Migration 114: partner account suspension, store profile change review,
-- store categories.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
DO $$ BEGIN
 IF has_function_privilege('anon','admin_set_partner_suspension(uuid,boolean,text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','admin_set_partner_suspension(uuid,boolean,text,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Partner suspension RPC exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','admin_set_partner_suspension(uuid,boolean,text,uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Admin cannot suspend partners'; END IF;
 IF has_table_privilege('anon','partner_account_actions','SELECT') OR has_table_privilege('authenticated','partner_account_actions','SELECT') THEN
  RAISE EXCEPTION 'Partner audit trail exposed to API roles'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug,is_active) VALUES('00000000-0000-4000-8000-0000001140a0','Controls zone 114','controls-zone-114',true);
INSERT INTO users(id,phone,role,is_approved) VALUES
 ('00000000-0000-4000-8000-0000001140e1','+919999911401','store_owner',true),
 ('00000000-0000-4000-8000-0000001140e2','+919999911402','customer',false),
 ('00000000-0000-4000-8000-0000001140e3','+919999911403','store_owner',true);
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,is_active,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000001140f1','00000000-0000-4000-8000-0000001140e1','00000000-0000-4000-8000-0000001140a0','Partner store','Kirana & Grocery','Udupi',true,13.2,74.7);
SET LOCAL session_replication_role=origin;

-- 1. Partner suspension: reason required, store closed, cannot reopen, audited.
DO $$ DECLARE r jsonb; s stores; BEGIN
 BEGIN
  PERFORM admin_set_partner_suspension('00000000-0000-4000-8000-0000001140e1',true,' ',null);
  RAISE EXCEPTION 'Suspension without reason accepted';
 EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;
 BEGIN
  PERFORM admin_set_partner_suspension('00000000-0000-4000-8000-0000001140e2',true,'Not a partner',null);
  RAISE EXCEPTION 'Customer account suspended as partner';
 EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;
 BEGIN
  PERFORM admin_set_partner_suspension('00000000-0000-4000-8000-0000001140ff',true,'Missing',null);
  RAISE EXCEPTION 'Unknown partner accepted';
 EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
 r:=admin_set_partner_suspension('00000000-0000-4000-8000-0000001140e1',true,'  Repeated cancellations ','00000000-0000-4000-8000-0000001140e3');
 IF (r->>'partner_suspended')::boolean IS NOT TRUE OR r->>'partner_suspended_reason'<>'Repeated cancellations' THEN
  RAISE EXCEPTION 'Suspension not recorded: %', r; END IF;
 SELECT * INTO s FROM stores WHERE id='00000000-0000-4000-8000-0000001140f1';
 IF s.is_active THEN RAISE EXCEPTION 'Suspended partner store still open'; END IF;
 BEGIN
  UPDATE stores SET is_active=true WHERE id='00000000-0000-4000-8000-0000001140f1';
  RAISE EXCEPTION 'Suspended partner reopened the store';
 EXCEPTION WHEN sqlstate 'P0409' THEN
  IF SQLERRM<>'PARTNER_SUSPENDED' THEN RAISE; END IF;
 END;
 r:=admin_set_partner_suspension('00000000-0000-4000-8000-0000001140e1',false,null,'00000000-0000-4000-8000-0000001140e3');
 IF (r->>'partner_suspended')::boolean OR r->>'partner_suspended_reason' IS NOT NULL THEN RAISE EXCEPTION 'Reinstatement failed'; END IF;
 IF (SELECT is_active FROM stores WHERE id='00000000-0000-4000-8000-0000001140f1') THEN
  RAISE EXCEPTION 'Reinstatement reopened the store by itself'; END IF;
 UPDATE stores SET is_active=true WHERE id='00000000-0000-4000-8000-0000001140f1';
 IF (SELECT count(*) FROM partner_account_actions WHERE user_id='00000000-0000-4000-8000-0000001140e1')<>2
 OR NOT EXISTS(SELECT 1 FROM partner_account_actions WHERE user_id='00000000-0000-4000-8000-0000001140e1'
   AND action='suspend' AND reason='Repeated cancellations' AND admin_id='00000000-0000-4000-8000-0000001140e3')
 OR NOT EXISTS(SELECT 1 FROM partner_account_actions WHERE user_id='00000000-0000-4000-8000-0000001140e1' AND action='reinstate') THEN
  RAISE EXCEPTION 'Partner actions not audited'; END IF;
END $$;

-- 2. Pharmacy drug licence travels with the onboarding draft.
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public'
   AND table_name='store_onboarding_drafts' AND column_name='drug_license_number') THEN
  RAISE EXCEPTION 'Draft cannot hold a drug licence'; END IF;
END $$;

-- 3. Store profile change review: live store untouched until approved.
DO $$ BEGIN
 IF has_function_privilege('authenticated','partner_request_store_profile_change(uuid,uuid,jsonb)','EXECUTE')
 OR has_function_privilege('anon','admin_review_store_profile_change(uuid,boolean,text,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','admin_review_store_profile_change(uuid,boolean,text,uuid)','EXECUTE')
 OR has_table_privilege('authenticated','store_profile_change_requests','SELECT') THEN
  RAISE EXCEPTION 'Store change review exposed to API roles'; END IF;
END $$;
DO $$ DECLARE r store_profile_change_requests; s stores; first_id uuid; BEGIN
 BEGIN
  PERFORM partner_request_store_profile_change('00000000-0000-4000-8000-0000001140f1','00000000-0000-4000-8000-0000001140e1','{"is_active":true}');
  RAISE EXCEPTION 'Unreviewed field accepted';
 EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;
 BEGIN
  PERFORM partner_request_store_profile_change('00000000-0000-4000-8000-0000001140f1','00000000-0000-4000-8000-0000001140e3','{"name":"Hijack"}');
  RAISE EXCEPTION 'Another owner filed a change';
 EXCEPTION WHEN sqlstate 'P0403' THEN NULL; END;
 r:=partner_request_store_profile_change('00000000-0000-4000-8000-0000001140f1','00000000-0000-4000-8000-0000001140e1',
   '{"name":"Renamed store","lat":13.5,"lng":74.9,"district":"Udupi"}');
 first_id:=r.id;
 IF r.status<>'pending' OR r.changes<>'{"name":"Renamed store","lat":13.5,"lng":74.9}'::jsonb OR r.previous->>'name'<>'Partner store' THEN
  RAISE EXCEPTION 'Change not filed as expected: % %', r.changes, r.previous; END IF;
 SELECT * INTO s FROM stores WHERE id='00000000-0000-4000-8000-0000001140f1';
 IF s.name<>'Partner store' OR s.lat<>13.2 THEN RAISE EXCEPTION 'Pending change went live'; END IF;
 -- A newer edit merges into the pending one; a field set back to live drops out.
 r:=partner_request_store_profile_change('00000000-0000-4000-8000-0000001140f1','00000000-0000-4000-8000-0000001140e1',
   '{"category":"Pharmacy","lat":13.2,"lng":74.7}');
 IF r.changes<>'{"name":"Renamed store","category":"Pharmacy"}'::jsonb THEN RAISE EXCEPTION 'Merge wrong: %', r.changes; END IF;
 IF (SELECT status FROM store_profile_change_requests WHERE id=first_id)<>'superseded'
 OR (SELECT count(*) FROM store_profile_change_requests WHERE store_id='00000000-0000-4000-8000-0000001140f1' AND status='pending')<>1 THEN
  RAISE EXCEPTION 'Older pending change not superseded'; END IF;
 BEGIN
  PERFORM admin_review_store_profile_change(first_id,true,null,null);
  RAISE EXCEPTION 'Superseded change approved';
 EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 -- Pharmacy without a licence cannot be approved (and nothing is applied).
 BEGIN
  PERFORM admin_review_store_profile_change(r.id,true,null,null);
  RAISE EXCEPTION 'Pharmacy without licence approved';
 EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;
 IF (SELECT name FROM stores WHERE id='00000000-0000-4000-8000-0000001140f1')<>'Partner store' THEN
  RAISE EXCEPTION 'Failed approval leaked changes'; END IF;
 BEGIN
  PERFORM admin_review_store_profile_change(r.id,false,'x',null);
  RAISE EXCEPTION 'Rejection without reason accepted';
 EXCEPTION WHEN sqlstate 'P0400' THEN NULL; END;
 r:=admin_review_store_profile_change(r.id,false,'Need a drug licence for pharmacy','00000000-0000-4000-8000-0000001140e3');
 IF r.status<>'rejected' OR r.review_reason<>'Need a drug licence for pharmacy' OR r.reviewed_at IS NULL THEN
  RAISE EXCEPTION 'Rejection not recorded'; END IF;
 -- A clean request is applied on approval, null clears a text field.
 r:=partner_request_store_profile_change('00000000-0000-4000-8000-0000001140f1','00000000-0000-4000-8000-0000001140e1',
   '{"name":"Renamed store","lat":13.5,"lng":74.9,"category":"Pharmacy","drug_license_number":"KA-20B-1","manual_address":"","address_line":null}');
 IF r.changes ? 'manual_address' OR r.changes ? 'address_line' THEN RAISE EXCEPTION 'Blank equal to live kept'; END IF;
 r:=admin_review_store_profile_change(r.id,true,null,'00000000-0000-4000-8000-0000001140e3');
 SELECT * INTO s FROM stores WHERE id='00000000-0000-4000-8000-0000001140f1';
 IF r.status<>'approved' OR s.name<>'Renamed store' OR s.lat<>13.5 OR s.lng<>74.9 OR s.category<>'Pharmacy'
 OR s.drug_license_number<>'KA-20B-1' OR s.district<>'Udupi' THEN RAISE EXCEPTION 'Approved change not applied'; END IF;
 -- Same values as live: nothing to review.
 IF partner_request_store_profile_change('00000000-0000-4000-8000-0000001140f1','00000000-0000-4000-8000-0000001140e1','{"name":"Renamed store"}') IS NOT NULL THEN
  RAISE EXCEPTION 'No-op change filed'; END IF;
END $$;

ROLLBACK;

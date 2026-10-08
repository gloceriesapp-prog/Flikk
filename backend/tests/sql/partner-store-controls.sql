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

ROLLBACK;

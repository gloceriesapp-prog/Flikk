\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
-- Permissions: correction RPC is service_role only; the audit table is read-only to it and hidden from API roles.
DO $$ BEGIN
 IF has_function_privilege('anon','admin_correct_rider_earning(uuid,bigint,text,text,boolean)','EXECUTE')
  OR has_function_privilege('authenticated','admin_correct_rider_earning(uuid,bigint,text,text,boolean)','EXECUTE') THEN RAISE EXCEPTION 'correction exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','admin_correct_rider_earning(uuid,bigint,text,text,boolean)','EXECUTE') THEN RAISE EXCEPTION 'service_role cannot correct earnings'; END IF;
 IF has_table_privilege('service_role','rider_earning_corrections','INSERT')
  OR has_table_privilege('authenticated','rider_earning_corrections','SELECT')
  OR has_table_privilege('anon','rider_earning_corrections','SELECT') THEN RAISE EXCEPTION 'audit table writable or exposed'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000e0a00','Earn zone','earn-zone');
INSERT INTO users(id,phone,role,is_approved,name) VALUES
 ('00000000-0000-4000-8000-0000000ec001','+918000000001','customer',true,'Cust'),
 ('00000000-0000-4000-8000-0000000ed001','+918000000002','store_owner',true,'Owner'),
 ('00000000-0000-4000-8000-0000000e5001','+918000000003','rider',true,'Rider');
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,phone,lat,lng) VALUES
 ('00000000-0000-4000-8000-0000000ef001','00000000-0000-4000-8000-0000000ed001','00000000-0000-4000-8000-0000000e0a00','Earn shop','grocery','Test','+918000000004',12.9,74.8);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-0000000eb001','00000000-0000-4000-8000-0000000ec001','1 Earn Road','00000000-0000-4000-8000-0000000e0a00');
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,status,order_number,rider_id) VALUES
 ('00000000-0000-4000-8000-0000000e0101','00000000-0000-4000-8000-0000000ec001','00000000-0000-4000-8000-0000000ef001','00000000-0000-4000-8000-0000000eb001',100,40,6,140,'cod','delivered','FLK-E01','00000000-0000-4000-8000-0000000e5001'),
 ('00000000-0000-4000-8000-0000000e0102','00000000-0000-4000-8000-0000000ec001','00000000-0000-4000-8000-0000000ef001','00000000-0000-4000-8000-0000000eb001',100,70,6,170,'cod','delivered','FLK-E02','00000000-0000-4000-8000-0000000e5001'),
 ('00000000-0000-4000-8000-0000000e0103','00000000-0000-4000-8000-0000000ec001','00000000-0000-4000-8000-0000000ef001','00000000-0000-4000-8000-0000000eb001',100,50,6,150,'cod','delivered','FLK-E03','00000000-0000-4000-8000-0000000e5001'),
 ('00000000-0000-4000-8000-0000000e0104','00000000-0000-4000-8000-0000000ec001','00000000-0000-4000-8000-0000000ef001','00000000-0000-4000-8000-0000000eb001',100,60,6,160,'cod','delivered','FLK-E04','00000000-0000-4000-8000-0000000e5001');
INSERT INTO rider_payouts(id,rider_id,week_start,week_end,amount) VALUES
 ('00000000-0000-4000-8000-0000000e6001','00000000-0000-4000-8000-0000000e5001','2026-10-05','2026-10-11',60);
INSERT INTO rider_earnings(id,rider_id,order_id,amount,base_amount,extra_stop_amount,paid_at,rider_payout_id) VALUES
 ('00000000-0000-4000-8000-0000000e1001','00000000-0000-4000-8000-0000000e5001','00000000-0000-4000-8000-0000000e0101',40.00,40.00,0,NULL,NULL),
 ('00000000-0000-4000-8000-0000000e1002','00000000-0000-4000-8000-0000000e5001','00000000-0000-4000-8000-0000000e0102',70.00,40.00,30.00,NULL,NULL),
 ('00000000-0000-4000-8000-0000000e1003','00000000-0000-4000-8000-0000000e5001','00000000-0000-4000-8000-0000000e0103',50.00,50.00,0,now(),NULL),
 ('00000000-0000-4000-8000-0000000e1004','00000000-0000-4000-8000-0000000e5001','00000000-0000-4000-8000-0000000e0104',60.00,60.00,0,NULL,'00000000-0000-4000-8000-0000000e6001');
SET LOCAL session_replication_role=origin;

-- Valid correction on an unsettled earning: amount + base updated, audited, delta recorded.
DO $$ DECLARE r jsonb; BEGIN
 r:=admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1001',5500,'Mis-keyed fee at delivery','ops@example.com');
 IF (r->>'changed')::boolean IS NOT TRUE OR (r->>'old_amount_paise')::bigint<>4000 OR (r->>'new_amount_paise')::bigint<>5500 OR (r->>'delta_paise')::bigint<>1500 OR (r->>'was_settled')::boolean THEN RAISE EXCEPTION 'correction result wrong: %',r; END IF;
 IF (SELECT amount=55.00 AND base_amount=55.00 AND coalesce(extra_stop_amount,0)=0 AND paid_at IS NULL FROM rider_earnings WHERE id='00000000-0000-4000-8000-0000000e1001') IS NOT TRUE THEN RAISE EXCEPTION 'earning not updated'; END IF;
 IF (SELECT count(*) FROM rider_earning_corrections WHERE earning_id='00000000-0000-4000-8000-0000000e1001'
   AND old_amount_paise=4000 AND new_amount_paise=5500 AND delta_paise=1500 AND reason='Mis-keyed fee at delivery' AND admin_email='ops@example.com' AND NOT was_settled)<>1 THEN RAISE EXCEPTION 'correction not audited'; END IF;
END $$;

-- Idempotent no-op: same amount again changes nothing and is not re-audited.
DO $$ DECLARE r jsonb; BEGIN
 r:=admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1001',5500,'retry','ops@example.com');
 IF (r->>'changed')::boolean OR (r->>'delta_paise')::bigint<>0 THEN RAISE EXCEPTION 'no-op not detected: %',r; END IF;
 IF (SELECT count(*) FROM rider_earning_corrections WHERE earning_id='00000000-0000-4000-8000-0000000e1001')<>1 THEN RAISE EXCEPTION 'no-op was audited'; END IF;
END $$;

-- Extra-stop portion is preserved; base is recomputed as amount - extra.
DO $$ BEGIN
 PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1002',9000,'Underpaid trip','ops@example.com');
 IF (SELECT amount=90.00 AND base_amount=60.00 AND extra_stop_amount=30.00 FROM rider_earnings WHERE id='00000000-0000-4000-8000-0000000e1002') IS NOT TRUE THEN RAISE EXCEPTION 'trip split not preserved'; END IF;
 -- A new amount below the extra-stop portion is refused (base would go negative).
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1002',2000,'too low','ops@example.com'); RAISE EXCEPTION 'below-extra accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
END $$;

-- Amount, reason and admin-email guards.
DO $$ BEGIN
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1001',0,'r','ops@example.com'); RAISE EXCEPTION 'zero accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1001',-5,'r','ops@example.com'); RAISE EXCEPTION 'negative accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1001',10000001,'r','ops@example.com'); RAISE EXCEPTION 'over-cap accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1001',5000,'  ','ops@example.com'); RAISE EXCEPTION 'blank reason accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1001',5000,'r',' '); RAISE EXCEPTION 'blank admin accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-00000000dead',5000,'r','ops@example.com'); RAISE EXCEPTION 'missing earning accepted'; EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
END $$;

-- Settled earnings are protected: paid_at and payout-batched both refuse without allow_settled.
DO $$ DECLARE r jsonb; BEGIN
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1003',7000,'fix','ops@example.com'); RAISE EXCEPTION 'paid earning corrected without override'; EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 BEGIN PERFORM admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1004',7000,'fix','ops@example.com'); RAISE EXCEPTION 'payout-batched earning corrected without override'; EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 -- Explicit override corrects it, flags was_settled, and leaves paid_at intact (the cash already went out).
 r:=admin_correct_rider_earning('00000000-0000-4000-8000-0000000e1003',7000,'Approved post-payout adjustment','ops@example.com',true);
 IF (r->>'was_settled')::boolean IS NOT TRUE OR (r->>'changed')::boolean IS NOT TRUE THEN RAISE EXCEPTION 'override result wrong: %',r; END IF;
 IF (SELECT amount=70.00 AND paid_at IS NOT NULL FROM rider_earnings WHERE id='00000000-0000-4000-8000-0000000e1003') IS NOT TRUE THEN RAISE EXCEPTION 'override did not update or touched paid_at'; END IF;
 IF (SELECT count(*) FROM rider_earning_corrections WHERE earning_id='00000000-0000-4000-8000-0000000e1003' AND was_settled)<>1 THEN RAISE EXCEPTION 'settled correction not audited'; END IF;
END $$;
ROLLBACK;
SELECT 'Rider earning correction: valid update, idempotent no-op, extra-stop preservation, amount/reason guards, settled protection + override passed' AS result;

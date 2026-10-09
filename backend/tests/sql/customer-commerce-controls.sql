\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
-- Permissions: every new RPC is service_role only; audit/template/message tables are read-only to it.
DO $$ DECLARE f text; BEGIN
 FOREACH f IN ARRAY ARRAY['record_admin_control(text,text,jsonb,text)','admin_update_customer_profile(uuid,text,text,text)',
  'admin_update_checkout_settings(boolean,boolean,numeric,text)','admin_update_notification_template(text,text,text,text)',
  'admin_send_customer_push(text,text,uuid,text)','admin_retry_customer_notification(uuid,text)'] LOOP
  IF has_function_privilege('anon',f,'EXECUTE') OR has_function_privilege('authenticated',f,'EXECUTE') THEN RAISE EXCEPTION '% exposed to API roles',f; END IF;
  IF NOT has_function_privilege('service_role',f,'EXECUTE') THEN RAISE EXCEPTION 'service_role cannot run %',f; END IF;
 END LOOP;
 IF has_table_privilege('service_role','admin_control_audit','INSERT') OR has_table_privilege('authenticated','admin_control_audit','SELECT')
  OR has_table_privilege('service_role','customer_notification_templates','UPDATE') OR has_table_privilege('anon','customer_notification_templates','SELECT')
  OR has_table_privilege('service_role','admin_push_messages','INSERT') THEN RAISE EXCEPTION 'Audited tables writable or exposed'; END IF;
 IF (SELECT count(*) FROM customer_notification_templates WHERE title=default_title AND body=default_body)<>6 THEN RAISE EXCEPTION 'Template defaults not seeded'; END IF;
 IF (SELECT cod_enabled AND online_payments_enabled AND min_order_value=0 FROM platform_settings LIMIT 1) IS NOT TRUE THEN RAISE EXCEPTION 'Checkout setting defaults changed'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-00000000ca00','Controls zone','controls-zone');
INSERT INTO users(id,phone,role,is_approved,name) VALUES
 ('00000000-0000-4000-8000-00000000cc01','+919999970001','customer',true,'Asha'),
 ('00000000-0000-4000-8000-00000000cc02','+919999970002','customer',true,'Ravi'),
 ('00000000-0000-4000-8000-00000000cc03','+919999970003','customer',true,'Gone'),
 ('00000000-0000-4000-8000-00000000cd01','+919999970004','store_owner',true,'Owner');
UPDATE users SET deletion_completed_at=now() WHERE id='00000000-0000-4000-8000-00000000cc03';
INSERT INTO stores(id,owner_user_id,zone_id,name,category,district,phone,lat,lng) VALUES
 ('00000000-0000-4000-8000-00000000cf01','00000000-0000-4000-8000-00000000cd01','00000000-0000-4000-8000-00000000ca00','Controls shop','grocery','Test','+919999970005',12.975,77.598);
INSERT INTO addresses(id,user_id,line1,zone_id) VALUES('00000000-0000-4000-8000-00000000cb01','00000000-0000-4000-8000-00000000cc01','1 Controls Road','00000000-0000-4000-8000-00000000ca00');
INSERT INTO orders(id,customer_id,store_id,address_id,item_total,delivery_fee,commission_amount,total,payment_method,status,order_number)
 VALUES('00000000-0000-4000-8000-00000000c101','00000000-0000-4000-8000-00000000cc01','00000000-0000-4000-8000-00000000cf01',
  '00000000-0000-4000-8000-00000000cb01',100,20,6,120,'cod','placed','FLK-777');
SET LOCAL session_replication_role=origin;

-- #43 customer profile edit, audited; phone untouched; non-customers refused.
DO $$ DECLARE r jsonb; BEGIN
 r:=admin_update_customer_profile('00000000-0000-4000-8000-00000000cc01','  Asha K ',' Asha@Example.com ','Admin@Example.com');
 IF (SELECT name||'|'||email||'|'||phone FROM users WHERE id='00000000-0000-4000-8000-00000000cc01')<>'Asha K|asha@example.com|+919999970001' THEN
  RAISE EXCEPTION 'Profile not saved: %',r; END IF;
 IF (SELECT count(*) FROM admin_control_audit WHERE action='customer_profile_update' AND target_id='00000000-0000-4000-8000-00000000cc01'
   AND admin_email='admin@example.com' AND detail->'from'->>'name'='Asha' AND detail->'to'->>'email'='asha@example.com')<>1 THEN RAISE EXCEPTION 'Profile edit not audited'; END IF;
 r:=admin_update_customer_profile('00000000-0000-4000-8000-00000000cc01','Asha K','asha@example.com','admin@example.com');
 IF (r->>'changed')::boolean OR (SELECT count(*) FROM admin_control_audit WHERE action='customer_profile_update')<>1 THEN RAISE EXCEPTION 'No-op edit audited'; END IF;
 PERFORM admin_update_customer_profile('00000000-0000-4000-8000-00000000cc01','Asha K','','admin@example.com');
 IF (SELECT email FROM users WHERE id='00000000-0000-4000-8000-00000000cc01') IS NOT NULL THEN RAISE EXCEPTION 'Email not cleared'; END IF;
 BEGIN PERFORM admin_update_customer_profile('00000000-0000-4000-8000-00000000cc01','Asha','not-an-email','admin@example.com');
  RAISE EXCEPTION 'Bad email accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_update_customer_profile('00000000-0000-4000-8000-00000000cc01','  ',NULL,'admin@example.com');
  RAISE EXCEPTION 'Blank name accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_update_customer_profile('00000000-0000-4000-8000-00000000cd01','Owner two',NULL,'admin@example.com');
  RAISE EXCEPTION 'Store owner edited as customer'; EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
 BEGIN PERFORM admin_update_customer_profile('00000000-0000-4000-8000-00000000cc03','Back',NULL,'admin@example.com');
  RAISE EXCEPTION 'Deleted account edited'; EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 BEGIN PERFORM admin_update_customer_profile('00000000-0000-4000-8000-00000000cc01','Asha',NULL,' ');
  RAISE EXCEPTION 'Anonymous edit accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
END $$;

-- #49/#50 checkout settings: validated, audited, at least one payment method on.
DO $$ BEGIN
 PERFORM admin_update_checkout_settings(false,true,149.50,'admin@example.com');
 IF (SELECT NOT cod_enabled AND online_payments_enabled AND min_order_value=149.50 FROM platform_settings LIMIT 1) IS NOT TRUE THEN RAISE EXCEPTION 'Settings not saved'; END IF;
 IF (SELECT count(*) FROM admin_control_audit WHERE action='checkout_settings_update' AND (detail->'from'->>'cod_enabled')::boolean
   AND NOT (detail->'to'->>'cod_enabled')::boolean)<>1 THEN RAISE EXCEPTION 'Settings change not audited'; END IF;
 BEGIN PERFORM admin_update_checkout_settings(false,false,0,'admin@example.com'); RAISE EXCEPTION 'Both payment methods off accepted';
  EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_update_checkout_settings(true,true,-1,'admin@example.com'); RAISE EXCEPTION 'Negative minimum accepted';
  EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_update_checkout_settings(true,true,10.005,'admin@example.com'); RAISE EXCEPTION 'Sub-paise minimum accepted';
  EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN UPDATE platform_settings SET cod_enabled=false,online_payments_enabled=false; RAISE EXCEPTION 'Direct write turned both off';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

-- #48 templates drive the order trigger; {order_number} is filled in; edits audited.
DO $$ BEGIN
 PERFORM admin_update_notification_template('packed','Packed: {order_number}','Order {order_number} is ready to go.','admin@example.com');
 UPDATE orders SET status='packed' WHERE id='00000000-0000-4000-8000-00000000c101';
 IF (SELECT title||'|'||body FROM customer_notifications WHERE order_id='00000000-0000-4000-8000-00000000c101' AND event='packed')
   <>'Packed: FLK-777|Order FLK-777 is ready to go.' THEN RAISE EXCEPTION 'Template not used by trigger'; END IF;
 IF (SELECT count(*) FROM admin_control_audit WHERE action='notification_template_update' AND target_id='packed')<>1 THEN RAISE EXCEPTION 'Template edit not audited'; END IF;
 -- A missing template row falls back to the original wording.
 SET LOCAL session_replication_role=replica;
 DELETE FROM customer_notification_templates WHERE event='out_for_delivery';
 SET LOCAL session_replication_role=origin;
 UPDATE orders SET status='out_for_delivery' WHERE id='00000000-0000-4000-8000-00000000c101';
 IF (SELECT title FROM customer_notifications WHERE order_id='00000000-0000-4000-8000-00000000c101' AND event='out_for_delivery')<>'Your order is on the way' THEN
  RAISE EXCEPTION 'Fallback wording lost'; END IF;
 BEGIN PERFORM admin_update_notification_template('packed','',' x ','admin@example.com'); RAISE EXCEPTION 'Empty title accepted';
  EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_update_notification_template('shipped','A','B','admin@example.com'); RAISE EXCEPTION 'Unknown event accepted';
  EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
END $$;

-- #48 admin push: one customer or all live customers, through the outbox, rate-limited and audited.
DO $$ DECLARE r jsonb; n uuid; i integer; BEGIN
 r:=admin_send_customer_push('Hello','Fresh mangoes today','00000000-0000-4000-8000-00000000cc02','admin@example.com');
 IF (r->>'recipients')::int<>1 OR (SELECT count(*) FROM customer_notifications WHERE admin_message_id=(r->>'message_id')::uuid
   AND customer_id='00000000-0000-4000-8000-00000000cc02' AND order_id IS NULL AND push_sent_at IS NULL)<>1 THEN RAISE EXCEPTION 'Single push not queued: %',r; END IF;
 FOR i IN 1..2 LOOP PERFORM admin_send_customer_push('Hello','Again','00000000-0000-4000-8000-00000000cc02','admin@example.com'); END LOOP;
 BEGIN PERFORM admin_send_customer_push('Hello','Fourth','00000000-0000-4000-8000-00000000cc02','admin@example.com');
  RAISE EXCEPTION 'Per-customer limit not applied'; EXCEPTION WHEN sqlstate 'P0429' THEN NULL; END;
 BEGIN PERFORM admin_send_customer_push('Hello','Owner','00000000-0000-4000-8000-00000000cd01','admin@example.com');
  RAISE EXCEPTION 'Pushed a store owner'; EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
 BEGIN PERFORM admin_send_customer_push('Hello','Deleted','00000000-0000-4000-8000-00000000cc03','admin@example.com');
  RAISE EXCEPTION 'Pushed a deleted account'; EXCEPTION WHEN sqlstate 'P0404' THEN NULL; END;
 BEGIN PERFORM admin_send_customer_push(repeat('x',81),'Too long',NULL,'admin@example.com');
  RAISE EXCEPTION 'Long title accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 r:=admin_send_customer_push('Sale','Everything 10% off',NULL,'admin@example.com');
 IF (r->>'recipients')::int <> (SELECT count(*) FROM users WHERE role='customer' AND deletion_completed_at IS NULL)
  OR EXISTS(SELECT 1 FROM customer_notifications WHERE admin_message_id=(r->>'message_id')::uuid AND customer_id IN('00000000-0000-4000-8000-00000000cc03','00000000-0000-4000-8000-00000000cd01'))
  OR (SELECT recipient_count FROM admin_push_messages WHERE id=(r->>'message_id')::uuid)<>(r->>'recipients')::int THEN RAISE EXCEPTION 'Broadcast audience wrong: %',r; END IF;
 BEGIN PERFORM admin_send_customer_push('Sale','Again',NULL,'admin@example.com');
  RAISE EXCEPTION 'Second broadcast within the hour accepted'; EXCEPTION WHEN sqlstate 'P0429' THEN NULL; END;
 IF (SELECT count(*) FROM admin_control_audit WHERE action='admin_push_send')<>4 THEN RAISE EXCEPTION 'Push sends not audited'; END IF;
 -- An admin message without an order is allowed; a row with neither is not.
 BEGIN INSERT INTO customer_notifications(customer_id,event,title,body) VALUES('00000000-0000-4000-8000-00000000cc01','x','t','b');
  RAISE EXCEPTION 'Orphan notification accepted'; EXCEPTION WHEN check_violation THEN NULL; END;

 -- Retry: a failed (out of attempts) row is requeued, keeping attempts >= 1 for receipt de-duplication.
 SELECT id INTO n FROM customer_notifications WHERE customer_id='00000000-0000-4000-8000-00000000cc02' AND admin_message_id IS NOT NULL LIMIT 1;
 UPDATE customer_notifications SET attempts=6,last_error='Push provider unavailable',next_attempt_at=now()+interval '1 hour' WHERE id=n;
 PERFORM admin_retry_customer_notification(n,'admin@example.com');
 IF (SELECT attempts=1 AND last_error IS NULL AND next_attempt_at<=now() FROM customer_notifications WHERE id=n) IS NOT TRUE THEN RAISE EXCEPTION 'Retry did not requeue'; END IF;
 IF NOT EXISTS(SELECT 1 FROM claim_customer_notifications(50) c WHERE c.id=n) THEN RAISE EXCEPTION 'Requeued row not claimable'; END IF;
 BEGIN PERFORM admin_retry_customer_notification(n,'admin@example.com'); RAISE EXCEPTION 'Leased row requeued';
  EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 UPDATE customer_notifications SET push_sent_at=now(),lease_until=NULL WHERE id=n;
 BEGIN PERFORM admin_retry_customer_notification(n,'admin@example.com'); RAISE EXCEPTION 'Sent row requeued';
  EXCEPTION WHEN sqlstate 'P0409' THEN NULL; END;
 IF (SELECT count(*) FROM admin_control_audit WHERE action='admin_push_retry' AND target_id=n::text)<>1 THEN RAISE EXCEPTION 'Retry not audited'; END IF;
END $$;
ROLLBACK;
SELECT 'Customer profile edit, checkout settings, notification templates, admin push limits and outbox retry passed' AS result;

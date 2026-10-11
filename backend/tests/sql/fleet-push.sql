\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
-- Permissions: the fleet-push RPC is service_role only; the message table stays read-only to it.
DO $$ BEGIN
 IF has_function_privilege('anon','admin_send_fleet_push(text,text,text,text)','EXECUTE')
  OR has_function_privilege('authenticated','admin_send_fleet_push(text,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'fleet push exposed to API roles'; END IF;
 IF NOT has_function_privilege('service_role','admin_send_fleet_push(text,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'service_role cannot run fleet push'; END IF;
 IF has_table_privilege('service_role','admin_push_messages','INSERT') THEN RAISE EXCEPTION 'admin_push_messages writable by service_role'; END IF;
END $$;

SET LOCAL session_replication_role=replica;
INSERT INTO zones(id,name,slug) VALUES('00000000-0000-4000-8000-0000000f0a00','Fleet zone','fleet-zone');
INSERT INTO users(id,phone,role,is_approved,name,expo_push_token) VALUES
 ('00000000-0000-4000-8000-0000000f1001','+919000000001','rider',true,'Rider A','ExponentPushToken[A]'),
 ('00000000-0000-4000-8000-0000000f1002','+919000000002','rider',true,'Rider B offline','ExponentPushToken[B]'),
 ('00000000-0000-4000-8000-0000000f1003','+919000000003','rider',true,'Rider C no device',NULL),
 ('00000000-0000-4000-8000-0000000f1004','+919000000004','rider',false,'Rider D pending','ExponentPushToken[D]'),
 ('00000000-0000-4000-8000-0000000f1005','+919000000005','rider',true,'Rider E on delivery','ExponentPushToken[E]'),
 ('00000000-0000-4000-8000-0000000f2001','+919000000006','store_owner',true,'Partner P1','ExponentPushToken[P1]'),
 ('00000000-0000-4000-8000-0000000f2002','+919000000007','store_owner',false,'Partner P2 pending','ExponentPushToken[P2]'),
 ('00000000-0000-4000-8000-0000000f2003','+919000000008','store_owner',true,'Partner P3 no device',NULL),
 ('00000000-0000-4000-8000-0000000f2004','+919000000009','store_owner',true,'Partner P4 deleted','ExponentPushToken[P4]');
UPDATE users SET deletion_completed_at=now() WHERE id='00000000-0000-4000-8000-0000000f2004';
INSERT INTO riders(id,user_id,name,phone,is_active,status) VALUES
 ('00000000-0000-4000-8000-0000000f3001','00000000-0000-4000-8000-0000000f1001','Rider A','+919000000001',true,'online'),
 ('00000000-0000-4000-8000-0000000f3002','00000000-0000-4000-8000-0000000f1002','Rider B','+919000000002',true,'offline'),
 ('00000000-0000-4000-8000-0000000f3003','00000000-0000-4000-8000-0000000f1003','Rider C','+919000000003',true,'online'),
 ('00000000-0000-4000-8000-0000000f3004','00000000-0000-4000-8000-0000000f1004','Rider D','+919000000004',true,'online'),
 ('00000000-0000-4000-8000-0000000f3005','00000000-0000-4000-8000-0000000f1005','Rider E','+919000000005',true,'on_delivery');
SET LOCAL session_replication_role=origin;

-- online_riders: approved + active + status online/on_delivery + has a token = A, E.
DO $$ DECLARE r jsonb; BEGIN
 r:=admin_send_fleet_push('online_riders','Surge now','Come online for ₹30 extra per drop','ops@example.com');
 IF (r->>'recipient_count')::int<>2 OR jsonb_array_length(r->'tokens')<>2 THEN RAISE EXCEPTION 'online_riders count wrong: %',r; END IF;
 IF NOT (r->'tokens' @> '["ExponentPushToken[A]","ExponentPushToken[E]"]'::jsonb) THEN RAISE EXCEPTION 'online_riders tokens wrong: %',r; END IF;
 IF (SELECT recipient_count FROM admin_push_messages WHERE id=(r->>'message_id')::uuid AND audience='online_riders' AND customer_id IS NULL)<>2 THEN RAISE EXCEPTION 'message row wrong'; END IF;
 IF (SELECT count(*) FROM admin_control_audit WHERE action='admin_fleet_push_send' AND target_id='online_riders'
   AND admin_email='ops@example.com' AND (detail->>'recipients')::int=2)<>1 THEN RAISE EXCEPTION 'fleet send not audited'; END IF;
END $$;

-- all_riders: every approved rider with a token regardless of status = A, B, E (C has none, D unapproved).
DO $$ DECLARE r jsonb; BEGIN
 r:=admin_send_fleet_push('all_riders','Policy update','New pickup etiquette in your app','ops@example.com');
 IF (r->>'recipient_count')::int<>3 OR NOT (r->'tokens' @> '["ExponentPushToken[A]","ExponentPushToken[B]","ExponentPushToken[E]"]'::jsonb) THEN RAISE EXCEPTION 'all_riders wrong: %',r; END IF;
 IF r->'tokens' @> '["ExponentPushToken[D]"]'::jsonb THEN RAISE EXCEPTION 'pushed an unapproved rider'; END IF;
END $$;

-- partners: approved store owners with a token, excluding the deleted account = P1 only.
DO $$ DECLARE r jsonb; BEGIN
 r:=admin_send_fleet_push('partners','Store notice','Please keep your catalogue in stock','ops@example.com');
 IF (r->>'recipient_count')::int<>1 OR NOT (r->'tokens' @> '["ExponentPushToken[P1]"]'::jsonb) THEN RAISE EXCEPTION 'partners wrong: %',r; END IF;
 IF r->'tokens' @> '["ExponentPushToken[P4]"]'::jsonb THEN RAISE EXCEPTION 'pushed a deleted partner'; END IF;
END $$;

-- Validation + rate limiting.
DO $$ BEGIN
 BEGIN PERFORM admin_send_fleet_push('everyone','t','b','ops@example.com'); RAISE EXCEPTION 'unknown audience accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_send_fleet_push('all_riders','','b','ops@example.com'); RAISE EXCEPTION 'empty title accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_send_fleet_push('all_riders','t',repeat('x',241),'ops@example.com'); RAISE EXCEPTION 'long body accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 BEGIN PERFORM admin_send_fleet_push('all_riders','t','b',' '); RAISE EXCEPTION 'anonymous send accepted'; EXCEPTION WHEN sqlstate 'P0422' THEN NULL; END;
 -- online_riders was just sent above (this transaction) -> per-minute guard trips.
 BEGIN PERFORM admin_send_fleet_push('online_riders','t','b','ops@example.com'); RAISE EXCEPTION 'second online_riders within a minute accepted'; EXCEPTION WHEN sqlstate 'P0429' THEN NULL; END;
END $$;

-- Hourly cap: 20 older-than-a-minute sends to one audience block the 21st even though the per-minute guard is clear.
DO $$ BEGIN
 INSERT INTO admin_push_messages(audience,title,body,recipient_count,admin_email,created_at)
 SELECT 'online_riders','old','old',0,'ops@example.com',now()-interval '5 minutes' FROM generate_series(1,20);
 BEGIN PERFORM admin_send_fleet_push('online_riders','t','b','ops@example.com'); RAISE EXCEPTION 'hourly cap not enforced'; EXCEPTION WHEN sqlstate 'P0429' THEN NULL; END;
END $$;
ROLLBACK;
SELECT 'Fleet push audience resolution, recipient_count, audit, validation and rate limits passed' AS result;

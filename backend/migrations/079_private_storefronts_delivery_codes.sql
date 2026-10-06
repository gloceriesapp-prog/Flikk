BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Some deployed schemas never applied 049. Retain the API compatibility
-- column, but keep it NULL; actual verification codes live only privately.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_otp text;
-- Direct table reads must obey the same public contract as the API.
DO $$ DECLARE c record; columns text; BEGIN
 REVOKE SELECT ON public.stores FROM PUBLIC,anon,authenticated;
 FOR c IN SELECT attname FROM pg_attribute WHERE attrelid='public.stores'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE SELECT (%I) ON public.stores FROM PUBLIC,anon,authenticated',c.attname);
 END LOOP;
 SELECT string_agg(quote_ident(attname),',' ORDER BY attnum) INTO columns FROM pg_attribute
 WHERE attrelid='public.stores'::regclass AND attnum>0 AND NOT attisdropped AND attname=ANY(ARRAY[
 'id','zone_id','name','category','rating','avg_prep_minutes','is_active','open_time','close_time','lat','lng','delivery_radius_km','photo_url','address_line','manual_address','district','city','fssai_number']);
 EXECUTE format('GRANT SELECT (%s) ON public.stores TO anon,authenticated',columns);
 EXECUTE format('CREATE VIEW public.storefronts WITH (security_invoker=true) AS SELECT %s FROM public.stores',columns);
 GRANT SELECT ON public.storefronts TO anon,authenticated,service_role;
 -- Existing participant RLS subqueries require this ownership identifier;
 -- it is excluded from the public storefront/API contract.
 GRANT SELECT(owner_user_id) ON public.stores TO authenticated;
END $$;
CREATE TABLE public.delivery_codes(
 scope_id uuid PRIMARY KEY, customer_id uuid NOT NULL REFERENCES public.users(id),
 code text NOT NULL CHECK(code ~ '^[0-9]{4}$'), expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5), consumed_at timestamptz
);
CREATE INDEX delivery_codes_expiry ON delivery_codes(expires_at);
ALTER TABLE public.delivery_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.delivery_codes FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.delivery_codes TO service_role;
-- Preserve active customer codes during rollout, without exposing them on orders.
INSERT INTO delivery_codes(scope_id,customer_id,code,expires_at)
 SELECT DISTINCT ON(coalesce(trip_id,id)) coalesce(trip_id,id),customer_id,
 CASE WHEN delivery_otp ~ '^[0-9]{4}$' THEN delivery_otp
 ELSE (1000+(('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint%9000))::text END,
 now()+interval '2 hours'
 FROM orders WHERE status='out_for_delivery'
 -- Prefer an existing valid trip code; generate one when none was stored.
 ORDER BY coalesce(trip_id,id),(delivery_otp ~ '^[0-9]{4}$') DESC NULLS LAST,id;
UPDATE orders SET delivery_otp=null WHERE delivery_otp IS NOT NULL;
CREATE FUNCTION public.protect_delivery_code() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE scope uuid; fresh text;
BEGIN
 NEW.delivery_otp:=null; -- legacy clients and SELECT * must never expose a secret
 IF TG_OP='UPDATE' AND NEW.status='out_for_delivery' AND OLD.status IS DISTINCT FROM NEW.status THEN
  scope:=coalesce(NEW.trip_id,NEW.id);
  -- Random UUID entropy comes from the OS CSPRNG, not PostgreSQL random().
  fresh:=(1000+(('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint%9000))::text;
  INSERT INTO delivery_codes(scope_id,customer_id,code,expires_at)
   VALUES(scope,NEW.customer_id,fresh,now()+interval '2 hours') ON CONFLICT(scope_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER private_delivery_code BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION protect_delivery_code();
CREATE FUNCTION public.customer_delivery_codes(p_customer uuid,p_orders uuid[]) RETURNS TABLE(order_id uuid,code text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT o.id,c.code FROM orders o JOIN delivery_codes c ON c.scope_id=coalesce(o.trip_id,o.id)
 WHERE o.id=ANY(p_orders) AND o.customer_id=p_customer AND c.customer_id=p_customer
 AND o.status='out_for_delivery' AND c.expires_at>now() AND c.attempts<5 AND c.consumed_at IS NULL
 AND cardinality(p_orders)<=100;
$$;
CREATE FUNCTION public.complete_verified_delivery(p_order uuid,p_rider uuid,p_code text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o orders; c delivery_codes; scope uuid;
BEGIN
 SELECT coalesce(trip_id,id) INTO scope FROM orders WHERE id=p_order AND rider_id=p_rider;
 IF scope IS NULL THEN RETURN jsonb_build_object('accepted',false,'error','ORDER_NOT_FOUND'); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 SELECT * INTO o FROM orders WHERE id=p_order AND rider_id=p_rider FOR UPDATE;
 IF o.status='delivered' THEN RETURN jsonb_build_object('accepted',true,'order',to_jsonb(o)); END IF;
 IF o.status<>'out_for_delivery' THEN RETURN jsonb_build_object('accepted',false,'error','ORDER_CHANGED'); END IF;
 SELECT * INTO c FROM delivery_codes WHERE scope_id=scope FOR UPDATE;
 IF NOT FOUND OR c.consumed_at IS NOT NULL OR c.expires_at<=now() THEN
  RETURN jsonb_build_object('accepted',false,'error','CODE_EXPIRED'); END IF;
 IF c.attempts>=5 THEN RETURN jsonb_build_object('accepted',false,'error','CODE_LOCKED'); END IF;
 IF p_code IS DISTINCT FROM c.code THEN
  UPDATE delivery_codes SET attempts=attempts+1 WHERE scope_id=scope;
  RETURN jsonb_build_object('accepted',false,'error','INVALID_OTP'); -- commit failed attempt
 END IF;
 UPDATE orders SET status='delivered',delivered_at=now() WHERE id=o.id RETURNING * INTO o;
 IF NOT EXISTS(SELECT 1 FROM orders WHERE coalesce(trip_id,id)=scope AND status NOT IN('delivered','cancelled','failed')) THEN
  UPDATE delivery_codes SET consumed_at=now() WHERE scope_id=scope;
 END IF;
 RETURN jsonb_build_object('accepted',true,'order',to_jsonb(o));
END $$;
REVOKE ALL ON FUNCTION protect_delivery_code(),customer_delivery_codes(uuid,uuid[]),complete_verified_delivery(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION customer_delivery_codes(uuid,uuid[]),complete_verified_delivery(uuid,uuid,text) TO service_role;
CREATE FUNCTION public.prune_delivery_codes() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE removed integer;
BEGIN
 WITH due AS(SELECT scope_id FROM delivery_codes WHERE expires_at<now()-interval '1 day' ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM delivery_codes c USING due WHERE c.scope_id=due.scope_id;
 GET DIAGNOSTICS removed=ROW_COUNT; RETURN removed;
END $$;
REVOKE ALL ON FUNCTION prune_delivery_codes() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION prune_delivery_codes() TO service_role;
-- Support can reissue a locked/expired code without revealing it to riders.
CREATE TABLE public.delivery_code_resets(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),actor_id uuid NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE delivery_code_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON delivery_code_resets FROM PUBLIC,anon,authenticated;
GRANT ALL ON delivery_code_resets TO service_role;
CREATE FUNCTION public.reissue_delivery_code(p_order uuid,p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o orders; scope uuid; fresh text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM users WHERE id=p_actor AND role='admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT * INTO o FROM orders WHERE id=p_order;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;
 scope:=coalesce(o.trip_id,o.id);
 PERFORM pg_advisory_xact_lock(hashtextextended(scope::text,790));
 SELECT * INTO o FROM orders WHERE id=p_order FOR UPDATE;
 IF o.status<>'out_for_delivery' THEN RAISE EXCEPTION 'Only an active delivery can receive a new code'; END IF;
 fresh:=(1000+(('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint%9000))::text;
 INSERT INTO delivery_codes(scope_id,customer_id,code,expires_at) VALUES(scope,o.customer_id,fresh,now()+interval '2 hours')
 ON CONFLICT(scope_id) DO UPDATE SET code=excluded.code,expires_at=excluded.expires_at,attempts=0,consumed_at=null;
 INSERT INTO delivery_code_resets(order_id,actor_id) VALUES(o.id,p_actor);
END $$;
REVOKE ALL ON FUNCTION reissue_delivery_code(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION reissue_delivery_code(uuid,uuid) TO service_role;
-- Repeat the auth revocation for installations that missed 078.
REVOKE ALL ON FUNCTION request_auth_context(uuid,uuid),request_auth_context_v2(uuid,uuid) FROM PUBLIC,anon,authenticated;
COMMIT;

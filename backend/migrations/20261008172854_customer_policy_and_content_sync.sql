-- Reviewed customer policies; apply after 118. No client-side financial authority.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
ALTER TABLE public.promo_codes ADD COLUMN starts_at timestamptz,
 ADD COLUMN per_customer_limit integer NOT NULL DEFAULT 1 CHECK(per_customer_limit BETWEEN 1 AND 100);
ALTER TABLE public.promo_codes ADD CONSTRAINT promo_valid_window CHECK(starts_at IS NULL OR expires_at IS NULL OR starts_at<expires_at);
ALTER TABLE public.promo_redemptions DROP CONSTRAINT promo_redemptions_promo_code_id_customer_id_key;
CREATE INDEX promo_customer_usage ON public.promo_redemptions(promo_code_id,customer_id);
-- One redemption per checkout even when a customer has several permitted uses.
CREATE UNIQUE INDEX promo_one_single_redemption ON public.promo_redemptions(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX promo_one_trip_redemption ON public.promo_redemptions(trip_id) WHERE trip_id IS NOT NULL;
CREATE OR REPLACE FUNCTION public.guard_promo_redemption() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p promo_codes; items numeric; payer uuid; items_p bigint; expected_p bigint;
BEGIN
 SELECT * INTO p FROM promo_codes WHERE id=NEW.promo_code_id FOR UPDATE;
 IF NOT FOUND OR NOT p.is_active OR (p.starts_at IS NOT NULL AND p.starts_at>clock_timestamp()) OR (p.expires_at IS NOT NULL AND p.expires_at<=clock_timestamp()) THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion is unavailable or expired'; END IF;
 IF p.usage_limit IS NOT NULL AND p.times_used>=p.usage_limit THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion usage limit reached'; END IF;
 IF (SELECT count(*) FROM promo_redemptions WHERE promo_code_id=p.id AND customer_id=NEW.customer_id)>=p.per_customer_limit THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='You have reached the usage limit for this code'; END IF;
 IF NEW.trip_id IS NOT NULL THEN SELECT item_total,customer_id INTO items,payer FROM trips WHERE id=NEW.trip_id;
 ELSE SELECT item_total,customer_id INTO items,payer FROM orders WHERE id=NEW.order_id; END IF;
 IF payer IS DISTINCT FROM NEW.customer_id OR items IS NULL OR items<p.min_order_value THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion does not qualify for this order'; END IF;
 items_p:=round(items*100)::bigint;
 expected_p:=CASE WHEN p.discount_type='flat' THEN round(p.discount_value*100)::bigint
  ELSE (items_p*round(p.discount_value*100)::bigint+5000)/10000 END;
 IF p.max_discount_amount IS NOT NULL THEN expected_p:=least(expected_p,round(p.max_discount_amount*100)::bigint); END IF;
 expected_p:=greatest(least(expected_p,items_p),0);
 IF NEW.discount_amount IS DISTINCT FROM expected_p::numeric/100 THEN
  RAISE EXCEPTION USING ERRCODE='P1003',MESSAGE='Promotion price changed; refresh checkout'; END IF;
 RETURN NEW;
END $$;
ALTER TABLE public.delivery_settings ADD COLUMN checkout_hold_minutes integer NOT NULL DEFAULT 20 CHECK(checkout_hold_minutes BETWEEN 16 AND 60),
 ADD COLUMN checkout_reconciliation_grace_minutes integer NOT NULL DEFAULT 30 CHECK(checkout_reconciliation_grace_minutes BETWEEN 5 AND 120);
-- Snapshot both deadlines. Subsequent admin edits apply only to new checkouts.
ALTER TABLE public.orders ADD COLUMN reservation_expires_at timestamptz, ADD COLUMN reservation_release_after timestamptz;
ALTER TABLE public.trips ADD COLUMN reservation_expires_at timestamptz, ADD COLUMN reservation_release_after timestamptz;
UPDATE public.orders SET reservation_expires_at=placed_at+interval '20 minutes',reservation_release_after=placed_at+interval '50 minutes';
UPDATE public.trips SET reservation_expires_at=created_at+interval '20 minutes',reservation_release_after=created_at+interval '50 minutes';
ALTER TABLE public.orders ALTER COLUMN reservation_expires_at SET NOT NULL, ALTER COLUMN reservation_release_after SET NOT NULL;
ALTER TABLE public.trips ALTER COLUMN reservation_expires_at SET NOT NULL, ALTER COLUMN reservation_release_after SET NOT NULL;
CREATE FUNCTION public.snapshot_checkout_deadlines() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE opened timestamptz; hold integer; grace integer;
BEGIN
 IF TG_OP='UPDATE' THEN
  NEW.reservation_expires_at:=OLD.reservation_expires_at; NEW.reservation_release_after:=OLD.reservation_release_after; RETURN NEW;
 END IF;
 IF TG_TABLE_NAME='orders' AND (to_jsonb(NEW)->>'trip_id') IS NOT NULL THEN
  SELECT reservation_expires_at,reservation_release_after INTO NEW.reservation_expires_at,NEW.reservation_release_after
   FROM trips WHERE id=(to_jsonb(NEW)->>'trip_id')::uuid;
  IF NEW.reservation_expires_at IS NULL THEN RAISE EXCEPTION 'Parent checkout deadline missing'; END IF;
  RETURN NEW;
 END IF;
 SELECT checkout_hold_minutes,checkout_reconciliation_grace_minutes INTO hold,grace FROM delivery_settings LIMIT 1;
 opened:=CASE WHEN TG_TABLE_NAME='orders' THEN (to_jsonb(NEW)->>'placed_at')::timestamptz ELSE (to_jsonb(NEW)->>'created_at')::timestamptz END;
 NEW.reservation_expires_at:=opened+make_interval(mins=>coalesce(hold,20));
 NEW.reservation_release_after:=NEW.reservation_expires_at+make_interval(mins=>coalesce(grace,30));
 RETURN NEW;
END $$;
CREATE TRIGGER orders_checkout_deadlines BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.snapshot_checkout_deadlines();
CREATE TRIGGER trips_checkout_deadlines BEFORE INSERT OR UPDATE ON public.trips FOR EACH ROW EXECUTE FUNCTION public.snapshot_checkout_deadlines();
CREATE FUNCTION public.checkout_reservation_deadline(p_kind text,p_target_id uuid) RETURNS timestamptz LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
 SELECT reservation_expires_at FROM orders WHERE p_kind='order' AND id=p_target_id
 UNION ALL SELECT reservation_expires_at FROM trips WHERE p_kind='trip' AND id=p_target_id
$$;
-- Preserve audited locking/refund bodies while replacing their legacy deadline
-- predicates. The migration asserts the named RPCs still exist before patching.
DO $$
DECLARE fn record; body text; found_functions integer:=0;
BEGIN
 FOR fn IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('claim_checkout_payment','claim_checkout_expiry_reconciliation','expire_checkout_reservation_batch','settle_checkout_payment','reserve_checkout_stock','abandon_unpaid_checkout') LOOP
  found_functions:=found_functions+1;
  body:=pg_get_functiondef(fn.oid);
  body:=replace(body, 'opened+interval ''20 minutes''', 'checkout_reservation_deadline(p_kind,p_target_id)');
  body:=replace(body, 'coalesce((r->>''placed_at'')::timestamptz,(r->>''created_at'')::timestamptz)+interval ''20 minutes''', '(r->>''reservation_expires_at'')::timestamptz');
  body:=replace(body, 'o.placed_at+interval ''20 minutes''', 'o.reservation_expires_at');
  body:=replace(body, 'placed_at+interval ''20 minutes''', 'reservation_expires_at');
  body:=replace(body, 'c.placed_at<=cutoff', 'c.reservation_expires_at<=checkout_clock()');
  body:=replace(body, 'cutoff timestamptz:=checkout_clock()-interval ''20 minutes'';', '');
  body:=replace(body, 'hard_cutoff timestamptz:=cutoff-interval ''30 minutes'';', '');
  body:=replace(body, 'child.placed_at<=cutoff', 'child.reservation_expires_at<=checkout_clock()');
  body:=replace(body, 'ord.placed_at<=cutoff', 'ord.reservation_expires_at<=checkout_clock()');
  body:=replace(body, 'o.placed_at<=cutoff', 'o.reservation_expires_at<=checkout_clock()');
  body:=replace(body, 'tr.created_at<=hard_cutoff', 'tr.reservation_release_after<=checkout_clock()');
  body:=replace(body, 'ord.placed_at<=hard_cutoff', 'ord.reservation_release_after<=checkout_clock()');
  EXECUTE body;
 END LOOP;
 IF found_functions<>6 THEN RAISE EXCEPTION 'Expected six checkout deadline functions, found %',found_functions; END IF;
END $$;
CREATE INDEX orders_pending_checkout_deadline ON public.orders(reservation_expires_at,id) WHERE status='placed' AND payment_method='online' AND provider_payment_id IS NULL;

CREATE TABLE public.customer_app_feedback (
 customer_id uuid PRIMARY KEY REFERENCES public.users(id), rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),
 comment text NOT NULL DEFAULT '' CHECK(length(comment)<=2000), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_app_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.customer_app_feedback FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.customer_app_feedback TO service_role;
ALTER TABLE public.area_upvotes ADD COLUMN customer_id uuid REFERENCES public.users(id),
 ADD COLUMN notify_when_available boolean NOT NULL DEFAULT false, ADD COLUMN notified_at timestamptz;
CREATE UNIQUE INDEX customer_area_waitlist ON public.area_upvotes(customer_id,address_label) WHERE customer_id IS NOT NULL;
ALTER TABLE public.customer_notifications ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.customer_notifications ADD COLUMN area_upvote_id uuid REFERENCES public.area_upvotes(id) ON DELETE CASCADE;
ALTER TABLE public.customer_notifications DROP CONSTRAINT customer_notifications_source_check;
ALTER TABLE public.customer_notifications ADD CONSTRAINT customer_notifications_source_check
 CHECK(order_id IS NOT NULL OR trip_id IS NOT NULL OR admin_message_id IS NOT NULL OR area_upvote_id IS NOT NULL);
CREATE UNIQUE INDEX customer_general_notification ON public.customer_notifications(customer_id,event) WHERE area_upvote_id IS NOT NULL;
-- Bounded batch + SKIP LOCKED; retrying a notification never creates duplicates.
CREATE FUNCTION public.notify_area_waitlist(p_address text,p_title text,p_body text,p_limit integer DEFAULT 100) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF p_address IS NULL OR p_title IS NULL OR p_body IS NULL OR p_limit IS NULL OR length(btrim(p_address)) NOT BETWEEN 1 AND 500 OR length(btrim(p_title)) NOT BETWEEN 1 AND 100 OR length(btrim(p_body)) NOT BETWEEN 1 AND 500
 OR p_limit NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid waitlist message'; END IF;
 WITH due AS(SELECT id,customer_id FROM area_upvotes WHERE address_label=p_address AND customer_id IS NOT NULL AND notify_when_available AND notified_at IS NULL
 ORDER BY created_at,id LIMIT p_limit FOR UPDATE SKIP LOCKED),
 queued AS(INSERT INTO customer_notifications(customer_id,event,title,body,area_upvote_id)
 SELECT customer_id,'area-available:'||md5(p_address),p_title,p_body,id FROM due ON CONFLICT(customer_id,event) WHERE area_upvote_id IS NOT NULL DO NOTHING RETURNING id)
 UPDATE area_upvotes a SET notified_at=now() FROM due WHERE a.id=due.id;
 GET DIAGNOSTICS n=ROW_COUNT; RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.notify_area_waitlist(text,text,text,integer),public.snapshot_checkout_deadlines(),public.checkout_reservation_deadline(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.notify_area_waitlist(text,text,text,integer),public.checkout_reservation_deadline(text,uuid) TO service_role;
-- Complete the realtime publication for admin-editable public content.
DO $$ DECLARE t text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH t IN ARRAY ARRAY['app_content','app_faqs','app_release_config','categories','category_sections','sub_categories','home_tab_banners','home_tab_tiles','platform_settings'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
   END IF;
  END LOOP;
 END IF;
END $$;
CREATE FUNCTION public.subscribe_area_waitlist(p_customer uuid,p_lat numeric,p_lng numeric,p_address text) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF p_customer IS NULL OR p_lat IS NULL OR p_lng IS NULL OR p_address IS NULL OR NOT EXISTS(SELECT 1 FROM users WHERE id=p_customer AND role='customer') OR p_lat NOT BETWEEN -90 AND 90 OR p_lng NOT BETWEEN -180 AND 180
 OR length(btrim(p_address)) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid waitlist'; END IF;
 INSERT INTO area_upvotes(customer_id,latitude,longitude,address_label,notify_when_available)
 VALUES(p_customer,p_lat,p_lng,btrim(p_address),true)
 ON CONFLICT(customer_id,address_label) WHERE customer_id IS NOT NULL DO UPDATE SET notify_when_available=true;
END $$;
REVOKE ALL ON FUNCTION public.subscribe_area_waitlist(uuid,numeric,numeric,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.subscribe_area_waitlist(uuid,numeric,numeric,text) TO service_role;
COMMIT;

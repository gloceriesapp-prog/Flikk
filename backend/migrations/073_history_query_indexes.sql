-- Cursor order always includes an ID tie-breaker. Query scopes retain owner filters.
CREATE INDEX IF NOT EXISTS orders_customer_solo_history_idx ON public.orders(customer_id, placed_at DESC, id DESC) WHERE trip_id IS NULL;
CREATE INDEX IF NOT EXISTS orders_store_history_idx ON public.orders(store_id, placed_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_store_status_history_idx ON public.orders(store_id, status, placed_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_rider_history_idx ON public.orders(rider_id, placed_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_status_history_idx ON public.orders(status, placed_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS trips_customer_history_idx ON public.trips(customer_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS payouts_store_history_idx ON public.payouts(store_id, week_start DESC, id DESC);
CREATE INDEX IF NOT EXISTS payouts_week_history_idx ON public.payouts(week_start DESC, id DESC);
CREATE INDEX IF NOT EXISTS orders_payout_breakdown_idx ON public.orders(store_id, delivered_at DESC, id DESC) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS reviews_store_history_idx ON public.reviews(store_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS rider_payouts_history_idx ON public.rider_payouts(rider_id, week_start DESC, id DESC);

-- Page checkout entities first, then hydrate all legs only for those entities.
-- Never split one multi-shop purchase at a page boundary.
CREATE OR REPLACE FUNCTION public.customer_purchase_page(
 p_customer uuid, p_limit int DEFAULT 20, p_before_at timestamptz DEFAULT NULL,
 p_before_id uuid DEFAULT NULL, p_before_trip boolean DEFAULT NULL,
 p_status text DEFAULT NULL, p_from timestamptz DEFAULT NULL,
 p_until timestamptz DEFAULT NULL, p_search text DEFAULT ''
) RETURNS TABLE(entity_id uuid, is_trip boolean, placed_at timestamptz)
LANGUAGE sql STABLE SET search_path = public AS $$
 WITH purchases AS (
   SELECT t.id entity_id, true is_trip, t.created_at AS placed_at, CASE WHEN p_status IS NULL THEN t.status::text ELSE (
       SELECT CASE min(CASE o.status::text WHEN 'placed' THEN 0 WHEN 'packed' THEN 1 WHEN 'out_for_delivery' THEN 2 WHEN 'delivered' THEN 3 ELSE 4 END) FILTER (WHERE o.status::text <> 'cancelled')
         WHEN 0 THEN 'placed' WHEN 1 THEN 'packed' WHEN 2 THEN 'out_for_delivery' WHEN 3 THEN 'delivered'
         ELSE CASE WHEN bool_or(o.status::text = 'failed') THEN 'failed' ELSE 'cancelled' END END
       FROM public.orders o WHERE o.trip_id = t.id AND o.customer_id = p_customer
     ) END AS status
   FROM public.trips t WHERE t.customer_id = p_customer
     AND EXISTS (SELECT 1 FROM public.orders o WHERE o.trip_id = t.id AND o.customer_id = p_customer)
   UNION ALL
   SELECT o.id, false, o.placed_at, o.status::text FROM public.orders o
   WHERE o.customer_id = p_customer AND o.trip_id IS NULL
 )
 SELECT h.entity_id, h.is_trip, h.placed_at FROM purchases h
 WHERE (p_before_at IS NULL OR (h.placed_at,h.entity_id,h.is_trip) < (p_before_at,p_before_id,p_before_trip))
 AND (p_status IS NULL OR h.status = p_status)
 AND (p_from IS NULL OR h.placed_at >= p_from) AND (p_until IS NULL OR h.placed_at < p_until)
 AND (coalesce(p_search,'') = '' OR EXISTS (
   SELECT 1 FROM public.orders o JOIN public.stores s ON s.id = o.store_id
   WHERE o.customer_id = p_customer AND (CASE WHEN h.is_trip THEN o.trip_id = h.entity_id ELSE o.id = h.entity_id END)
   AND (strpos(lower(s.name),lower(p_search)) > 0 OR EXISTS (
     SELECT 1 FROM public.order_items i JOIN public.products p ON p.id = i.product_id
     WHERE i.order_id = o.id AND strpos(lower(p.name),lower(p_search)) > 0
   ))
 ))
 ORDER BY h.placed_at DESC,h.entity_id DESC,h.is_trip DESC
 LIMIT least(greatest(p_limit,1),101);
$$;
REVOKE ALL ON FUNCTION public.customer_purchase_page(uuid,int,timestamptz,uuid,boolean,text,timestamptz,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.customer_purchase_page(uuid,int,timestamptz,uuid,boolean,text,timestamptz,timestamptz,text) TO service_role;

CREATE OR REPLACE FUNCTION public.partner_payout_counts(p_store uuid, p_ids uuid[])
RETURNS TABLE(id uuid, order_count bigint) LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT p.id, (SELECT count(*) FROM public.orders o
   WHERE o.store_id = p_store AND o.status::text = 'delivered'
     AND o.delivered_at >= (p.week_start::timestamp AT TIME ZONE 'Asia/Kolkata')
     AND o.delivered_at < (p.week_end::timestamp AT TIME ZONE 'Asia/Kolkata'))
 FROM public.payouts p WHERE p.store_id = p_store AND p.id = ANY(p_ids[1:101]);
$$;
REVOKE ALL ON FUNCTION public.partner_payout_counts(uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.partner_payout_counts(uuid,uuid[]) TO service_role;

-- Stable delivery-time snapshot for bounded rider earnings history. Historical
-- rows without a delivery timestamp remain undated rather than inventing one.
ALTER TABLE public.rider_earnings ADD COLUMN IF NOT EXISTS earned_at timestamptz;
UPDATE public.rider_earnings e SET earned_at = coalesce(
  (SELECT o.delivered_at FROM public.orders o WHERE o.id = e.order_id),
  (SELECT max(o.delivered_at) FROM public.orders o WHERE o.trip_id = e.trip_id)
) WHERE e.earned_at IS NULL;
CREATE OR REPLACE FUNCTION public.snapshot_earning_time() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.earned_at := coalesce(NEW.earned_at,(SELECT o.delivered_at FROM public.orders o WHERE o.id=NEW.order_id),now());
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS snapshot_earning_time ON public.rider_earnings;
CREATE TRIGGER snapshot_earning_time BEFORE INSERT ON public.rider_earnings FOR EACH ROW EXECUTE FUNCTION public.snapshot_earning_time();
CREATE INDEX IF NOT EXISTS rider_earnings_history_idx ON public.rider_earnings(rider_id,earned_at DESC,id DESC);
CREATE OR REPLACE FUNCTION public.rider_earning_totals(p_rider uuid,p_from timestamptz,p_until timestamptz)
RETURNS TABLE(day date,total numeric,base numeric,extra numeric,orders bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
 SELECT (e.earned_at AT TIME ZONE 'Asia/Kolkata')::date, sum(e.amount),
   sum(e.amount-least(e.amount,greatest(coalesce(legs.stops,1)-1,0)*15)),
   sum(least(e.amount,greatest(coalesce(legs.stops,1)-1,0)*15)),count(*)
 FROM public.rider_earnings e
 LEFT JOIN LATERAL (SELECT count(*) stops FROM public.orders o WHERE o.trip_id=e.trip_id) legs ON e.trip_id IS NOT NULL
 WHERE e.rider_id=p_rider AND e.earned_at>=p_from AND e.earned_at<p_until
   AND p_until>p_from AND p_until<=p_from+interval '32 days'
 GROUP BY 1 ORDER BY 1;
$$;
REVOKE ALL ON FUNCTION public.rider_earning_totals(uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.rider_earning_totals(uuid,timestamptz,timestamptz) TO service_role;

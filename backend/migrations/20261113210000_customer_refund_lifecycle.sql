-- Add truthful initiation visibility. No historical jobs are retried or paid here.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE VIEW public.customer_refund_history AS
 SELECT 'order:'||o.id::text AS id,'order'::text AS kind,o.id AS target_id,o.customer_id,o.order_number::text AS reference,
 o.total AS amount,o.refund_status AS status,coalesce(o.cancel_reason,'Order refund') AS reason,
 'Original payment method'::text AS destination,o.placed_at AS order_placed_at,
 coalesce(o.refund_updated_at,o.refunded_at) AS updated_at,o.provider_refund_id
 FROM public.orders o WHERE o.refund_status<>'none' AND NOT EXISTS(SELECT 1 FROM public.trip_refunds r WHERE r.trip_id=o.trip_id)
 UNION ALL
 SELECT 'trip:'||t.id::text,'trip',t.id,t.customer_id,'Multi-shop order',r.target_paise/100.0,r.status,
 'Multi-shop order cancelled','Original payment method',t.created_at,r.updated_at,r.provider_refund_id
 FROM public.trip_refunds r JOIN public.trips t ON t.id=r.trip_id;
REVOKE ALL ON public.customer_refund_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.customer_refund_history TO service_role;

CREATE FUNCTION public.record_customer_refund_notification() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE event_name text; heading text; copy text;
BEGIN
 IF NEW.refund_status IS NOT DISTINCT FROM OLD.refund_status
    AND NEW.provider_refund_id IS NOT DISTINCT FROM OLD.provider_refund_id THEN RETURN NEW; END IF;
 -- A combined trip refund updates every leg. Notify once, on its first leg.
 IF NEW.trip_id IS NOT NULL AND EXISTS(SELECT 1 FROM trip_refunds WHERE trip_id=NEW.trip_id)
    AND NEW.id IS DISTINCT FROM (SELECT id FROM orders WHERE trip_id=NEW.trip_id ORDER BY id LIMIT 1) THEN RETURN NEW; END IF;
 IF NEW.refund_status='completed' THEN
  event_name:='refund_completed'; heading:='Refund completed';
  copy:='Your refund has been processed to the original payment method. Check My refunds for details and bank processing times.';
 ELSIF NEW.refund_status='processing' AND NEW.provider_refund_id IS NOT NULL THEN
  event_name:='refund_initiated:'||NEW.provider_refund_id; heading:='Refund initiated';
  copy:='Your refund has been initiated to the original payment method. Check My refunds for the latest status.';
 ELSIF NEW.refund_status IN ('failed','manual_required') THEN
  event_name:='refund_attention'; heading:='Refund update';
  copy:='Your refund needs attention from our team. Open My refunds for details and support.';
 ELSIF NEW.refund_status='processing' THEN
  event_name:='refund_requested'; heading:='Refund requested';
  copy:='Your refund is queued. We will update you when it is initiated. You do not need to request it again.';
 ELSE RETURN NEW; END IF;
 INSERT INTO customer_notifications(customer_id,order_id,trip_id,event,title,body)
 VALUES(NEW.customer_id,NEW.id,NEW.trip_id,event_name,heading,copy)
 ON CONFLICT(order_id,event) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.record_customer_refund_notification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER customer_refund_notification AFTER UPDATE OF refund_status,provider_refund_id ON public.orders
 FOR EACH ROW EXECUTE FUNCTION public.record_customer_refund_notification();
NOTIFY pgrst,'reload schema';
COMMIT;

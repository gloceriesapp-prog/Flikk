BEGIN;
SET LOCAL lock_timeout='5s';
-- Visibility and the merchant alert commit together. One job per order/recipient,
-- independent of how many webhook/checkout retries observe the same settlement.
CREATE TABLE public.merchant_order_push_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','receipt','confirmed','failed','skipped')),
 attempts integer NOT NULL DEFAULT 0,
 receipt_attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid, lease_until timestamptz,
 ticket_id text, sent_token text,
 last_error text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
 UNIQUE(order_id,user_id)
);
CREATE INDEX merchant_order_push_due ON public.merchant_order_push_outbox(next_attempt_at,id) WHERE state IN ('pending','receipt');
ALTER TABLE public.merchant_order_push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.merchant_order_push_outbox FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.merchant_order_push_outbox TO service_role;

CREATE FUNCTION public.enqueue_merchant_order_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status='placed' AND NEW.accepted_at IS NULL AND NEW.store_visible_at IS NOT NULL
 AND (NEW.payment_method='cod' OR NEW.provider_payment_id IS NOT NULL)
 AND NOT coalesce(NEW.checkout_payment_rejected,false) THEN
  INSERT INTO public.merchant_order_push_outbox(order_id,store_id,user_id)
  SELECT NEW.id,NEW.store_id,u.id FROM public.users u
  WHERE u.is_approved AND u.role='store_owner' AND NOT coalesce(u.partner_suspended,false) AND (
   EXISTS(SELECT 1 FROM public.stores s WHERE s.id=NEW.store_id AND s.owner_user_id=u.id)
   OR EXISTS(SELECT 1 FROM public.store_memberships m WHERE m.store_id=NEW.store_id AND m.user_id=u.id AND m.is_active))
  ON CONFLICT(order_id,user_id) DO NOTHING;
 END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER merchant_order_push_enqueue AFTER INSERT OR UPDATE OF status,provider_payment_id,store_visible_at ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.enqueue_merchant_order_push();

CREATE FUNCTION public.claim_merchant_order_push(p_receipts boolean DEFAULT false,p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid,order_id uuid,user_id uuid,lease_token uuid,attempts integer,ticket_id text,token text,amount numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- Never send an old new-order alert after cancellation, or to removed staff.
 UPDATE public.merchant_order_push_outbox q SET state='skipped',completed_at=now(),last_error='Order or recipient no longer actionable'
 WHERE q.id IN (SELECT due.id FROM public.merchant_order_push_outbox due WHERE due.state='pending'
 AND due.next_attempt_at<=now() AND (due.lease_until IS NULL OR due.lease_until<now()) ORDER BY due.next_attempt_at,due.id LIMIT 200) AND (
 NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.id=q.order_id AND o.status='placed' AND o.accepted_at IS NULL AND o.acceptance_deadline_at>now() AND NOT coalesce(o.checkout_payment_rejected,false))
 OR NOT EXISTS(SELECT 1 FROM public.users u WHERE u.id=q.user_id AND u.is_approved AND u.role='store_owner' AND NOT coalesce(u.partner_suspended,false) AND (
 EXISTS(SELECT 1 FROM public.stores s WHERE s.id=q.store_id AND s.owner_user_id=u.id)
 OR EXISTS(SELECT 1 FROM public.store_memberships m WHERE m.store_id=q.store_id AND m.user_id=u.id AND m.is_active))));
 RETURN QUERY
 WITH candidates AS (
 SELECT q.id FROM public.merchant_order_push_outbox q
 WHERE q.state=CASE WHEN p_receipts THEN 'receipt' ELSE 'pending' END
 AND (p_receipts OR EXISTS(SELECT 1 FROM public.orders o WHERE o.id=q.order_id AND o.status='placed' AND o.accepted_at IS NULL AND o.acceptance_deadline_at>now() AND NOT coalesce(o.checkout_payment_rejected,false)))
 AND q.next_attempt_at<=now() AND (q.lease_until IS NULL OR q.lease_until<now())
 ORDER BY q.next_attempt_at,q.id LIMIT greatest(1,least(p_limit,50)) FOR UPDATE SKIP LOCKED
 ), claimed AS (
 UPDATE public.merchant_order_push_outbox q SET lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',
 attempts=q.attempts+CASE WHEN p_receipts THEN 0 ELSE 1 END,
 receipt_attempts=q.receipt_attempts+CASE WHEN p_receipts THEN 1 ELSE 0 END
 FROM candidates c WHERE q.id=c.id RETURNING q.*)
 SELECT c.id,c.order_id,c.user_id,c.lease_token,c.attempts,c.ticket_id,u.expo_push_token,
 CASE WHEN o.trip_id IS NOT NULL THEN o.item_total ELSE o.total END
 FROM claimed c JOIN public.users u ON u.id=c.user_id JOIN public.orders o ON o.id=c.order_id;
END; $$;

CREATE FUNCTION public.finish_merchant_order_push(p_id uuid,p_lease uuid,p_outcome text,p_ticket text DEFAULT NULL,p_token text DEFAULT NULL,p_error text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.merchant_order_push_outbox;
BEGIN
 SELECT * INTO q FROM public.merchant_order_push_outbox WHERE id=p_id AND lease_token=p_lease AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_outcome NOT IN ('ticket','confirmed','retry','receipt_pending','dead','skipped','failed') THEN RAISE EXCEPTION 'Invalid push outcome'; END IF;
 IF p_outcome='ticket' AND (q.state<>'pending' OR nullif(p_ticket,'') IS NULL OR nullif(p_token,'') IS NULL) THEN RAISE EXCEPTION 'Invalid push ticket'; END IF;
 IF p_outcome IN ('confirmed','receipt_pending') AND q.state<>'receipt' THEN RAISE EXCEPTION 'No receipt to confirm'; END IF;
 IF p_outcome='dead' THEN
  UPDATE public.users SET expo_push_token=NULL WHERE id=q.user_id AND expo_push_token=coalesce(q.sent_token,p_token);
 END IF;
 UPDATE public.merchant_order_push_outbox SET
 state=CASE WHEN p_outcome='ticket' THEN 'receipt' WHEN p_outcome='confirmed' THEN 'confirmed'
 WHEN p_outcome IN ('dead','skipped') THEN 'skipped' WHEN p_outcome='failed' THEN 'failed'
 WHEN p_outcome='retry' THEN CASE WHEN q.attempts>=8 THEN 'failed' ELSE 'pending' END
 WHEN q.receipt_attempts>=12 OR q.created_at<now()-interval '24 hours' THEN 'failed' ELSE 'receipt' END,
 ticket_id=CASE WHEN p_outcome='ticket' THEN p_ticket ELSE q.ticket_id END,
 sent_token=CASE WHEN p_outcome='ticket' THEN p_token ELSE q.sent_token END,
 next_attempt_at=now()+CASE WHEN p_outcome IN ('ticket','receipt_pending') THEN interval '15 minutes'
 ELSE make_interval(secs=>least(3600,30*power(2,least(q.attempts,7)))::integer) END,
 last_error=left(p_error,300),lease_token=NULL,lease_until=NULL,
 completed_at=CASE WHEN p_outcome IN ('confirmed','dead','skipped','failed') OR (p_outcome='retry' AND q.attempts>=8)
 OR (p_outcome='receipt_pending' AND (q.receipt_attempts>=12 OR q.created_at<now()-interval '24 hours')) THEN now() ELSE NULL END
 WHERE merchant_order_push_outbox.id=q.id;
 RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_merchant_order_push(),public.claim_merchant_order_push(boolean,integer),public.finish_merchant_order_push(uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_merchant_order_push(),public.claim_merchant_order_push(boolean,integer),public.finish_merchant_order_push(uuid,uuid,text,text,text,text) TO service_role;

NOTIFY pgrst,'reload schema';
COMMIT;

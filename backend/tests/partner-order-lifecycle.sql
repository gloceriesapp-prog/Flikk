-- Executed inside one rollback-only transaction by scripts/test-partner-order-lifecycle.mjs.
DO $$
DECLARE fixture public.orders; owner_id uuid; paid_id uuid; unpaid_id uuid; expired_id uuid; foreign_id uuid; r public.orders; saved_at timestamptz;
BEGIN
 IF has_function_privilege('anon','public.partner_accept_order(uuid,uuid,uuid)','EXECUTE') OR has_function_privilege('authenticated','public.partner_accept_order(uuid,uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'RPC permissions failed'; END IF;
 IF NOT has_function_privilege('service_role','public.partner_accept_order(uuid,uuid,uuid)','EXECUTE') THEN RAISE EXCEPTION 'Service RPC permission missing'; END IF;
 SELECT * INTO fixture FROM public.orders LIMIT 1;
 IF fixture.id IS NULL THEN RAISE EXCEPTION 'Local fixtures required'; END IF;
 SELECT owner_user_id INTO owner_id FROM public.stores WHERE id=fixture.store_id;
 UPDATE public.users SET role='store_owner',is_approved=true WHERE id=owner_id;
 UPDATE public.stores SET admin_suspended=false,avg_prep_minutes=12 WHERE id=fixture.store_id;
 -- Fixture insertion bypasses checkout creation validation only, within this rollback.
 ALTER TABLE public.orders DISABLE TRIGGER USER;
 fixture.id:=gen_random_uuid(); fixture.trip_id:=NULL; fixture.order_number:='acceptance-test-'||fixture.id; fixture.status:='placed'; fixture.packed_at:=NULL; fixture.accepted_at:=NULL; fixture.preparation_deadline_at:=NULL; fixture.payment_method:='cod'; fixture.provider_payment_id:=NULL; fixture.checkout_payment_rejected:=false; fixture.store_visible_at:=now(); fixture.acceptance_deadline_at:=now()+interval '10 minutes';
 paid_id:=fixture.id; INSERT INTO public.orders SELECT fixture.*;
 fixture.id:=gen_random_uuid(); fixture.order_number:='acceptance-test-'||fixture.id; fixture.payment_method:='online'; fixture.store_visible_at:=NULL; fixture.acceptance_deadline_at:=NULL;
 unpaid_id:=fixture.id; INSERT INTO public.orders SELECT fixture.*;
 fixture.id:=gen_random_uuid(); fixture.order_number:='acceptance-test-'||fixture.id; fixture.payment_method:='cod'; fixture.store_visible_at:=now()-interval '20 minutes'; fixture.acceptance_deadline_at:=now()-interval '10 minutes';
 expired_id:=fixture.id; INSERT INTO public.orders SELECT fixture.*;
 ALTER TABLE public.orders ENABLE TRIGGER USER;
 BEGIN PERFORM public.partner_accept_order(unpaid_id,fixture.store_id,owner_id); RAISE EXCEPTION 'Unpaid accepted'; EXCEPTION WHEN SQLSTATE 'P0409' THEN IF SQLERRM<>'PAYMENT_PENDING' THEN RAISE; END IF; END;
 BEGIN PERFORM public.partner_accept_order(expired_id,fixture.store_id,owner_id); RAISE EXCEPTION 'Expired accepted'; EXCEPTION WHEN SQLSTATE 'P0409' THEN IF SQLERRM<>'ACCEPTANCE_EXPIRED' THEN RAISE; END IF; END;
 BEGIN PERFORM public.partner_accept_order(paid_id,gen_random_uuid(),owner_id); RAISE EXCEPTION 'Foreign store accepted'; EXCEPTION WHEN SQLSTATE 'P0404' THEN NULL; END;
 BEGIN PERFORM public.partner_accept_order(paid_id,fixture.store_id,gen_random_uuid()); RAISE EXCEPTION 'Foreign owner accepted'; EXCEPTION WHEN SQLSTATE 'P0403' THEN NULL; END;
 UPDATE public.users SET partner_suspended=true WHERE id=owner_id;
 BEGIN PERFORM public.partner_accept_order(paid_id,fixture.store_id,owner_id); RAISE EXCEPTION 'Suspended owner accepted'; EXCEPTION WHEN SQLSTATE 'P0403' THEN NULL; END;
 UPDATE public.users SET partner_suspended=false WHERE id=owner_id;
 r:=public.partner_accept_order(paid_id,fixture.store_id,owner_id);
 IF r.accepted_at IS NULL OR r.status<>'placed' OR r.preparation_deadline_at<>r.accepted_at+interval '12 minutes' THEN RAISE EXCEPTION 'Acceptance/preparation state incorrect'; END IF;
 saved_at:=r.accepted_at; r:=public.partner_accept_order(paid_id,fixture.store_id,owner_id);
 IF r.accepted_at<>saved_at THEN RAISE EXCEPTION 'Retry changed accepted timestamp'; END IF;
 -- Expired acceptance deadline no longer cancels a persistently accepted order.
 UPDATE public.orders SET acceptance_deadline_at=now()-interval '1 minute' WHERE id=paid_id;
 PERFORM public.cancel_unanswered_store_orders(100);
 IF (SELECT status FROM public.orders WHERE id=paid_id)<>'placed' THEN RAISE EXCEPTION 'Accepted order was cancelled'; END IF;
 IF (SELECT status FROM public.orders WHERE id=expired_id)<>'cancelled' THEN RAISE EXCEPTION 'Unanswered order was not cancelled'; END IF;
 RAISE NOTICE '11 transactional acceptance, expiry and permission assertions passed';
END $$;


DO $$
DECLARE fixture public.orders; owner_id uuid; q public.merchant_order_push_outbox; claimed record; n integer;
BEGIN
 IF has_table_privilege('authenticated','public.merchant_order_push_outbox','SELECT') OR has_table_privilege('anon','public.merchant_order_push_outbox','SELECT') THEN RAISE EXCEPTION 'Private outbox exposed'; END IF;
 IF has_function_privilege('anon','public.claim_merchant_order_push(boolean,integer)','EXECUTE') OR has_function_privilege('authenticated','public.finish_merchant_order_push(uuid,uuid,text,text,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Outbox RPC exposed'; END IF;
 IF has_column_privilege('authenticated','public.orders','accepted_at','UPDATE') THEN RAISE EXCEPTION 'Acceptance is directly writable'; END IF;
 SELECT * INTO fixture FROM public.orders WHERE order_number NOT LIKE 'acceptance-test-%' LIMIT 1;
 SELECT owner_user_id INTO owner_id FROM public.stores WHERE id=fixture.store_id;
 UPDATE public.users SET role='store_owner',is_approved=true WHERE id=owner_id;
 ALTER TABLE public.orders DISABLE TRIGGER USER;
 fixture.id:=gen_random_uuid();fixture.trip_id:=NULL;fixture.order_number:='outbox-test-'||fixture.id;fixture.status:='placed';fixture.accepted_at:=NULL;fixture.packed_at:=NULL;fixture.store_visible_at:=now();fixture.acceptance_deadline_at:=now()+interval '10 minutes';fixture.payment_method:='cod';fixture.provider_payment_id:=NULL;fixture.checkout_payment_rejected:=false;
 INSERT INTO public.orders SELECT fixture.*;
 ALTER TABLE public.orders ENABLE TRIGGER USER;
 UPDATE public.orders SET store_visible_at=store_visible_at WHERE id=fixture.id;
 SELECT * INTO q FROM public.merchant_order_push_outbox WHERE order_id=fixture.id AND user_id=owner_id;
 IF q.id IS NULL THEN RAISE EXCEPTION 'Visible COD did not enqueue atomically'; END IF;
 UPDATE public.orders SET store_visible_at=store_visible_at WHERE id=fixture.id;
 SELECT count(*) INTO n FROM public.merchant_order_push_outbox WHERE order_id=fixture.id AND user_id=owner_id;
 IF n<>1 THEN RAISE EXCEPTION 'Duplicate notification'; END IF;
 SELECT * INTO claimed FROM public.claim_merchant_order_push(false,50) WHERE id=q.id;
 IF claimed.id IS NULL THEN RAISE EXCEPTION 'Claim failed'; END IF;
 IF public.finish_merchant_order_push(q.id,gen_random_uuid(),'ticket','ticket-a','ExponentPushToken[test]') THEN RAISE EXCEPTION 'Foreign lease accepted'; END IF;
 IF NOT public.finish_merchant_order_push(q.id,claimed.lease_token,'ticket','ticket-a','ExponentPushToken[test]') THEN RAISE EXCEPTION 'Ticket not saved'; END IF;
 IF (SELECT state FROM public.merchant_order_push_outbox WHERE id=q.id)<>'receipt' THEN RAISE EXCEPTION 'Ticket not in receipt state'; END IF;
 IF EXISTS(SELECT 1 FROM public.claim_merchant_order_push(false,50) WHERE id=q.id) THEN RAISE EXCEPTION 'Known ticket resent'; END IF;
 UPDATE public.merchant_order_push_outbox SET next_attempt_at=now()-interval '1 second' WHERE id=q.id;
 SELECT * INTO claimed FROM public.claim_merchant_order_push(true,50) WHERE id=q.id;
 IF NOT public.finish_merchant_order_push(q.id,claimed.lease_token,'confirmed') THEN RAISE EXCEPTION 'Receipt not confirmed'; END IF;
 IF (SELECT state FROM public.merchant_order_push_outbox WHERE id=q.id)<>'confirmed' THEN RAISE EXCEPTION 'Receipt state wrong'; END IF;
 RAISE NOTICE '12 outbox uniqueness, ownership, lease and receipt assertions passed';
END $$;

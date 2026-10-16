-- Local fixtures only, wrapped in BEGIN/ROLLBACK by the loopback-only runner.
-- No external payment API, notification provider or worker is called.
CREATE OR REPLACE FUNCTION public.checkout_clock() RETURNS timestamptz
LANGUAGE sql VOLATILE AS $$
 SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '12 hours') AT TIME ZONE 'Asia/Kolkata'
$$;
DO $$
DECLARE s public.stores; p public.products; v public.product_variants; a public.addresses;
 source_product uuid; price numeric; args jsonb; attempt uuid:=gen_random_uuid(); result jsonb; replay jsonb;
 cod_id uuid; online_id uuid; payment text:='pay_Test'||replace(gen_random_uuid()::text,'-',''); provider_order text:='order_Test'||replace(gen_random_uuid()::text,'-','');
BEGIN
 SELECT * INTO s FROM public.stores WHERE name='Chai store' LIMIT 1;
 IF s.id IS NULL THEN RAISE EXCEPTION 'Local Chai store fixture required'; END IF;
 SELECT * INTO p FROM public.products WHERE store_id=s.id LIMIT 1;
 SELECT a0.* INTO a FROM public.addresses a0 JOIN public.users u ON u.id=a0.user_id
  WHERE u.role='customer' AND a0.deleted_at IS NULL LIMIT 1;
 IF p.id IS NULL OR a.id IS NULL THEN RAISE EXCEPTION 'Local product and customer-address fixtures required'; END IF;
 UPDATE public.users SET is_approved=true,partner_suspended=false WHERE id=s.owner_user_id;
 UPDATE public.zones SET is_active=true WHERE id=s.zone_id;
 UPDATE public.stores SET is_active=true,admin_suspended=false,open_time='00:00',close_time='00:00',delivery_radius_km=12 WHERE id=s.id;
 UPDATE public.addresses SET latitude=s.lat,longitude=s.lng,zone_id=s.zone_id WHERE id=a.id;
 source_product:=p.id;
 p.id:=gen_random_uuid(); p.name:='Rollback order test '||p.id; p.approval_status:='approved';
 p.stock_tracking_enabled:=true;p.stock_quantity:=10;p.stock_status:='in_stock';p.is_in_stock:=true;
 p.pending_changes:=NULL;p.pending_image_url:=NULL;
 INSERT INTO public.products SELECT p.*;
 SELECT * INTO v FROM public.product_variants WHERE product_id=source_product ORDER BY is_default DESC,id LIMIT 1;
 IF v.id IS NOT NULL THEN
  v.id:=gen_random_uuid();v.product_id:=p.id;v.stock_quantity:=10;v.is_default:=true;
  INSERT INTO public.product_variants SELECT v.*;
 END IF;
 price:=coalesce(v.price,p.price);
 args:=jsonb_build_object('p_store_id',s.id,'p_address_id',a.id,'p_item_total',price,'p_delivery_fee',0,
  'p_commission_amount',round(price*0.1,2),'p_total',price,'p_discount_amount',0,'p_handling_fee',0,'p_payment_method','cod',
  'p_items',jsonb_build_array(jsonb_build_object('product_id',p.id,'variant_id',v.id,'quantity',1,
   'unit_price_at_order',price,'unit_at_order',p.unit,'variant_mrp_at_order',coalesce(v.original_price,price))));
 result:=public.create_checkout_attempt(a.user_id,attempt,repeat('a',64),'order',args);
 cod_id:=(result->'result'->>'id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=cod_id AND customer_id=a.user_id AND store_id=s.id AND status='placed' AND store_visible_at IS NOT NULL) THEN RAISE EXCEPTION 'COD did not reach assigned store'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id=cod_id AND product_name_at_order=p.name AND quantity=1 AND unit_price_at_order=price) THEN RAISE EXCEPTION 'Purchased snapshot missing'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inventory_reservations WHERE order_id=cod_id AND state='committed') THEN RAISE EXCEPTION 'COD stock not committed'; END IF;
 IF (SELECT count(*) FROM public.merchant_order_push_outbox WHERE order_id=cod_id AND user_id=s.owner_user_id)<>1 THEN RAISE EXCEPTION 'COD notification intent missing'; END IF;
 replay:=public.create_checkout_attempt(a.user_id,attempt,repeat('a',64),'order',args);
 IF NOT (replay->>'replayed')::boolean OR replay->'result'->>'id'<>cod_id::text THEN RAISE EXCEPTION 'Checkout retry duplicated order'; END IF;
 IF (SELECT stock_quantity FROM public.products WHERE id=p.id)<>9 THEN RAISE EXCEPTION 'Checkout retry consumed stock twice'; END IF;
 args:=args||jsonb_build_object('p_payment_method','online');
 result:=public.create_checkout_attempt(a.user_id,gen_random_uuid(),repeat('b',64),'order',args);
 online_id:=(result->'result'->>'id')::uuid;
 IF EXISTS(SELECT 1 FROM public.merchant_order_push_outbox WHERE order_id=online_id) THEN RAISE EXCEPTION 'Unpaid order alerted merchant'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.inventory_reservations WHERE order_id=online_id AND state='held') THEN RAISE EXCEPTION 'Online stock not reserved'; END IF;
 BEGIN
  PERFORM public.partner_accept_order(online_id,s.id,s.owner_user_id);
  RAISE EXCEPTION 'Unpaid order was accepted';
 EXCEPTION WHEN SQLSTATE 'P0409' THEN
  IF SQLERRM<>'PAYMENT_PENDING' THEN RAISE; END IF;
 END;
 INSERT INTO public.checkout_payment_sessions(kind,target_id,customer_id,provider_order_id,payment_provider)
  VALUES('order',online_id,a.user_id,provider_order,'razorpay');
 BEGIN
  PERFORM public.settle_checkout_payment(online_id,NULL,payment,round(price*100)::bigint+1,'INR',provider_order,'razorpay');
  RAISE EXCEPTION 'Wrong captured amount was accepted';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE 'settle_checkout_payment amount mismatch:%' THEN RAISE; END IF;
 END;
 result:=public.settle_checkout_payment(online_id,NULL,payment,round(price*100)::bigint,'INR',provider_order,'razorpay');
 IF NOT (result->>'accepted')::boolean OR NOT EXISTS(SELECT 1 FROM public.orders WHERE id=online_id AND provider_payment_id=payment AND store_visible_at IS NOT NULL) THEN RAISE EXCEPTION 'Verified payment did not expose store order'; END IF;
 IF (SELECT count(*) FROM public.merchant_order_push_outbox WHERE order_id=online_id AND user_id=s.owner_user_id)<>1 THEN RAISE EXCEPTION 'Paid order notification intent missing'; END IF;
 PERFORM public.partner_accept_order(online_id,s.id,s.owner_user_id);
 UPDATE public.orders SET status='packed' WHERE id=online_id;
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id=online_id AND accepted_at IS NOT NULL AND status='packed') THEN RAISE EXCEPTION 'Merchant acceptance/packing failed'; END IF;
 RAISE NOTICE 'Customer-to-store checkout, replay, stock, payment gating, notification intent and acceptance checks passed';
END $$;

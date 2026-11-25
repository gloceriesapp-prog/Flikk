-- Morning slot (2026-11-25): milk, bread, eggs, fish and the like can be
-- booked for an early pre-order slot (one ending by 10:00 AM IST,
-- backend/src/lib/preorders.ts MORNING_SLOT_ENDS_BY) instead of quick
-- delivery. They stay ordinary products everywhere else.
--
-- 1. products.morning_slot: the product may go in a morning-slot cart.
--    Backfilled from the milk, curd and eggs categories only (name matching
--    caught "fish masala"); bread and fresh fish are flagged per product.
-- 2. create_checkout_attempt: a delivery window is allowed for pre-order
--    products and for morning-slot products (the backend only sends a
--    morning slot for the latter). Everything else in the function is the
--    live definition, unchanged.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS morning_slot boolean NOT NULL DEFAULT false;

UPDATE public.products p SET morning_slot = true
WHERE NOT p.preorder_enabled AND NOT p.morning_slot AND (
  EXISTS (SELECT 1 FROM public.sub_categories s JOIN public.categories c ON c.id = s.category_id
          WHERE s.id = p.sub_category_id AND c.name IN ('Milk & Dairy Drinks', 'Curd & Yogurt', 'Eggs')));

CREATE OR REPLACE FUNCTION public.create_checkout_attempt(p_customer_id uuid, p_attempt_id uuid, p_fingerprint text, p_kind text, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a checkout_attempts; v_result jsonb; v_from timestamptz := (p_args->>'p_deliver_from')::timestamptz; v_tip numeric := coalesce((p_args->>'p_tip_amount')::numeric,0);
begin
  insert into checkout_attempts(customer_id,attempt_id,fingerprint,kind)
    values(p_customer_id,p_attempt_id,p_fingerprint,p_kind) on conflict do nothing;
  select * into a from checkout_attempts where customer_id=p_customer_id and attempt_id=p_attempt_id for update;
  if a.fingerprint<>p_fingerprint or a.kind<>p_kind then raise exception 'Attempt conflict' using errcode='P0409'; end if;
  if a.abandoned then raise exception 'Attempt closed' using errcode='P0410'; end if;
  if a.result is not null then return jsonb_build_object('result',a.result,'replayed',true); end if;
  if p_kind='order' then
    select to_jsonb(o) into v_result from create_order(p_customer_id,(p_args->>'p_store_id')::uuid,
      (p_args->>'p_address_id')::uuid,(p_args->>'p_item_total')::numeric,(p_args->>'p_delivery_fee')::numeric,
      (p_args->>'p_commission_amount')::numeric,(p_args->>'p_total')::numeric,p_args->'p_items',
      (p_args->>'p_promo_code_id')::uuid,(p_args->>'p_discount_amount')::numeric,p_args->>'p_payment_method',
      (p_args->>'p_handling_fee')::numeric) o;
    -- Pre-order products only with a slot; a slot only for pre-order or
    -- morning-slot products.
    if exists(select 1 from order_items i join products p on p.id=i.product_id
              where i.order_id=(v_result->>'id')::uuid
                and case when v_from is null then p.preorder_enabled else not (p.preorder_enabled or p.morning_slot) end) then
      raise exception using errcode='40001', message='Pre-order items need their own checkout';
    end if;
    if v_from is not null then
      -- Same pre-order window stamp_store_visible_at gives an online order once paid.
      update orders set deliver_from=v_from, deliver_until=(p_args->>'p_deliver_until')::timestamptz,
        acceptance_deadline_at=case when store_visible_at is not null then least(store_visible_at+interval '3 hours',v_from) end
        where id=(v_result->>'id')::uuid;
      select to_jsonb(o) into v_result from orders o where o.id=(v_result->>'id')::uuid;
    end if;
  elsif p_kind='trip' then
    if v_from is not null then raise exception using errcode='40001', message='Pre-orders come from one shop'; end if;
    select to_jsonb(t) into v_result from create_trip_orders(p_customer_id,(p_args->>'p_address_id')::uuid,
      (p_args->>'p_delivery_fee')::numeric,(p_args->>'p_item_total')::numeric,(p_args->>'p_total')::numeric,
      p_args->'p_legs',(p_args->>'p_promo_code_id')::uuid,(p_args->>'p_discount_amount')::numeric,
      p_args->>'p_payment_method',(p_args->>'p_handling_fee')::numeric) t;
    if exists(select 1 from orders o join order_items i on i.order_id=o.id join products p on p.id=i.product_id
              where o.trip_id=(v_result->>'id')::uuid and p.preorder_enabled) then
      raise exception using errcode='40001', message='Pre-order items need their own checkout';
    end if;
  else raise exception 'Invalid checkout kind'; end if;
  -- Rider tip (whole order or trip): already inside p_total; stored here so
  -- record_atomic_rider_earning can pay it to the rider in full.
  if v_tip<>0 then
    if p_kind='order' then
      update orders set tip_amount=v_tip where id=(v_result->>'id')::uuid;
      select to_jsonb(o) into v_result from orders o where o.id=(v_result->>'id')::uuid;
    else
      update trips set tip_amount=v_tip where id=(v_result->>'id')::uuid;
      select to_jsonb(t) into v_result from trips t where t.id=(v_result->>'id')::uuid;
    end if;
  end if;
  update checkout_attempts set result=v_result where customer_id=p_customer_id and attempt_id=p_attempt_id;
  return jsonb_build_object('result',v_result,'replayed',false);
end $function$;

COMMIT;
NOTIFY pgrst, 'reload schema';

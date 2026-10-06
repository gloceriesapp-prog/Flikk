-- Continuously drain bounded transactional batches; preserve parent/order/
-- product lock order and payment rechecks from migration 063.
CREATE INDEX IF NOT EXISTS orders_unpaid_expiry_idx ON public.orders(placed_at,id)
 WHERE status='placed' AND payment_method='online' AND razorpay_payment_id IS NULL AND trip_id IS NULL;
CREATE INDEX IF NOT EXISTS trips_unpaid_expiry_idx ON public.trips(created_at,id)
 WHERE status='placed' AND razorpay_payment_id IS NULL;
CREATE INDEX IF NOT EXISTS orders_trip_unpaid_expiry_idx ON public.orders(trip_id,placed_at)
 WHERE payment_method='online';
create or replace function public.expire_checkout_reservation_batch(p_limit integer default 100) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.trips; o public.orders; rows jsonb:='[]'; affected jsonb;
 singles integer:=0; trip_count integer:=0; target_trips uuid[]; target_singles uuid[];
 cutoff timestamptz:=checkout_clock()-interval '20 minutes';
begin
 if p_limit is null or p_limit not between 1 and 100 then raise exception 'Batch limit must be 1–100'; end if;
 perform set_config('lock_timeout','1000ms',true);
 -- Freeze the expiry cutoff once per batch so the indexed placed_at column
 -- is compared directly, rather than evaluating a volatile clock per row.
 select coalesce(array_agg(q.id),'{}') into target_trips from (
  select tr.id from public.trips tr where tr.status='placed' and tr.razorpay_payment_id is null
   and exists(select 1 from public.orders child where child.trip_id=tr.id and child.payment_method='online' and child.placed_at<=cutoff)
  order by tr.created_at,tr.id limit p_limit for update skip locked
 ) q;
 select coalesce(array_agg(q.id),'{}') into target_singles from (
  select ord.id from public.orders ord where ord.trip_id is null and ord.status='placed'
   and ord.payment_method='online' and ord.razorpay_payment_id is null and ord.placed_at<=cutoff
  order by ord.placed_at,ord.id limit p_limit for update skip locked
 ) q;
 -- Parent trip -> child orders -> products. Lock every product in the batch
 -- globally by ID before any release, avoiding opposing product lock order
 -- when workers drain disjoint orders containing shared inventory.
 perform 1 from public.orders where trip_id=any(target_trips) order by id for update;
 perform 1 from public.products where id in (
  select product_id from public.inventory_reservations r where r.state='held'
   and (r.order_id=any(target_singles) or r.order_id in(select id from public.orders where trip_id=any(target_trips)))
 ) order by id for update;
 for t in select * from public.trips where id=any(target_trips) order by id loop
  trip_count:=trip_count+1;
  with cancelled as (
   update public.orders set status='cancelled',cancel_reason='Payment was not completed in time.'
   where trip_id=t.id and status='placed' and razorpay_payment_id is null returning id,customer_id
  ) select coalesce(jsonb_agg(to_jsonb(cancelled)),'[]') into affected from cancelled;
  rows:=rows||affected;
  update public.trips set status='cancelled' where id=t.id;
 end loop;
 for o in select * from public.orders where id=any(target_singles) order by id loop
  singles:=singles+1;
  update public.orders set status='cancelled',cancel_reason='Payment was not completed in time.' where id=o.id;
  rows:=rows||jsonb_build_array(jsonb_build_object('id',o.id,'customer_id',o.customer_id));
 end loop;
 return jsonb_build_object('cancelled_orders',jsonb_array_length(rows),'single_targets',singles,'trip_targets',trip_count,'cancelled',rows);
end $$;

-- Keep old callers compatible during rollout; all expiry writes use the same
-- atomic implementation. Locks make concurrent old/new calls safe.
CREATE OR REPLACE FUNCTION public.expire_checkout_reservations() RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT public.expire_checkout_reservation_batch(100)->'cancelled';
$$;
REVOKE ALL ON FUNCTION public.expire_checkout_reservation_batch(integer),public.expire_checkout_reservations() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.expire_checkout_reservation_batch(integer),public.expire_checkout_reservations() TO service_role;
-- Retire the five-minute singleton; worker queues now drain expiry directly.
DELETE FROM public.scheduled_work WHERE name='expireUnpaidOrders';
CREATE OR REPLACE FUNCTION public.background_worker_ready()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT count(*)=3 AND to_regprocedure('public.expire_checkout_reservation_batch(integer)') IS NOT NULL
 FROM public.scheduled_work WHERE name IN ('weeklyPayouts','weeklyRiderPayouts','riderDispatch');
$$;

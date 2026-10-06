-- Requires 062. No stock is reserved for historical orders.
begin;
alter table public.products add column if not exists stock_quantity integer;
alter table public.products add column stock_tracking_enabled boolean not null default false;
-- Older clients saved placeholder zeroes next to in-stock labels. Do not
-- interpret those as counted inventory. Explicit future count edits opt in.
update public.products set stock_tracking_enabled = true
where stock_quantity > 0 or (stock_quantity = 0 and stock_status = 'out_of_stock');
alter table public.products add constraint tracked_stock_valid
check (not stock_tracking_enabled or (stock_quantity is not null and stock_quantity >= 0 and stock_quantity=trunc(stock_quantity::numeric)));
alter table public.orders add column checkout_payment_rejected boolean not null default false;
alter table public.trips add column checkout_payment_rejected boolean not null default false;
create table public.inventory_reservations (
  order_item_id uuid primary key references public.order_items(id),
  order_id uuid not null references public.orders(id),
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  state text not null check (state in ('held','committed','consumed','released')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.inventory_reservations enable row level security;
create index inventory_reservations_order_idx on public.inventory_reservations(order_id, state);
create index inventory_reservations_expiry_idx on public.inventory_reservations(expires_at) where state = 'held';

create function public.checkout_clock() returns timestamptz language sql volatile as $$ select clock_timestamp() $$;
create function public.checkout_time_minutes(value text) returns integer language plpgsql immutable as $$
declare m text[]; h integer; minutes integer;
begin
  m := regexp_match(trim(value), '^(\d{1,2}):(\d{2})(?::00)?\s*(AM|PM)?$', 'i');
  if m is null then return null; end if;
  h := m[1]::integer; minutes := m[2]::integer;
  if minutes > 59 or (m[3] is null and h > 23) or (m[3] is not null and (h < 1 or h > 12)) then return null; end if;
  if m[3] is not null then h := h % 12 + case when upper(m[3]) = 'PM' then 12 else 0 end; end if;
  return h * 60 + minutes;
end $$;
create function public.checkout_assert_store(customer uuid, address_id uuid, store_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a public.addresses; s public.stores; minute integer; opens integer; closes integer; radius double precision; km double precision; current_time_at timestamptz;
begin
  current_time_at := checkout_clock();
  minute := extract(hour from current_time_at at time zone 'Asia/Kolkata')::integer * 60
    + extract(minute from current_time_at at time zone 'Asia/Kolkata')::integer;
  if minute < 360 or minute >= 1350 then raise exception using errcode='P1001', message='Ordering is closed until 6:00 AM IST'; end if;
  select * into a from public.addresses where id=address_id and user_id=customer and deleted_at is null for share;
  if not found or a.latitude is null or a.longitude is null or not(a.latitude between -90 and 90 and a.longitude between -180 and 180) then
    raise exception using errcode='P1001', message='Choose a saved address with a valid map pin'; end if;
  select * into s from public.stores where id=store_id for share;
  if not found or not s.is_active then raise exception using errcode='P1001', message='Shop closed'; end if;
  perform 1 from public.zones where id=a.zone_id and id=s.zone_id and is_active for share;
  if not found then raise exception using errcode='P1001', message='Shop cannot deliver to this area'; end if;
  if nullif(trim(s.open_time),'') is not null or nullif(trim(s.close_time),'') is not null then
    opens := checkout_time_minutes(s.open_time); closes := checkout_time_minutes(s.close_time);
    if opens is null or closes is null or (opens < closes and not(minute >= opens and minute < closes))
      or (opens > closes and not(minute >= opens or minute < closes)) then
      raise exception using errcode='P1001', message='Shop closed'; end if;
  end if;
  radius := coalesce(s.delivery_radius_km,12);
  if s.lat is null or s.lng is null or not(s.lat between -90 and 90 and s.lng between -180 and 180) or radius <= 0 or radius::text in ('NaN','Infinity','-Infinity') then
    raise exception using errcode='P1001', message='Delivery from this shop is unavailable'; end if;
  km := 6371 * 2 * asin(sqrt(least(1.0,greatest(0.0,
    power(sin(radians(s.lat-a.latitude)/2),2) + cos(radians(a.latitude))*cos(radians(s.lat))*power(sin(radians(s.lng-a.longitude)/2),2)))));
  if km > radius then raise exception using errcode='P1001', message='Shop cannot deliver to this address'; end if;
end $$;
create function public.guard_checkout_order() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if TG_OP = 'INSERT' then
    perform checkout_assert_store(new.customer_id,new.address_id,new.store_id);
  else
    if new.status is distinct from old.status and not (
      (old.status='placed' and new.status in ('packed','cancelled'))
      or (old.status='packed' and new.status in ('out_for_delivery','cancelled'))
      or (old.status='out_for_delivery' and new.status in ('delivered','failed'))
    ) then raise exception using errcode='P1001', message='Invalid order state transition'; end if;
    if new.status in ('packed','out_for_delivery') and new.payment_method='online' and new.razorpay_payment_id is null then
      raise exception using errcode='P1001', message='Awaiting payment'; end if;
  end if;
  return new;
end $$;
create trigger orders_checkout_eligibility before insert or update of status on public.orders
for each row execute function public.guard_checkout_order();

create function public.sync_tracked_inventory() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if TG_OP='UPDATE' and old.stock_tracking_enabled and not new.stock_tracking_enabled
    and exists(select 1 from inventory_reservations where product_id=old.id and state in ('held','committed')) then
    raise exception 'Cannot disable inventory tracking while orders reserve stock'; end if;
  if new.stock_tracking_enabled and (TG_OP='INSERT' or new.stock_quantity is distinct from old.stock_quantity
    or new.stock_tracking_enabled is distinct from old.stock_tracking_enabled) then
    if new.stock_quantity <= 0 then new.stock_status:='out_of_stock'; new.is_in_stock:=false;
    elsif TG_OP='UPDATE' and old.stock_quantity>0 and old.stock_status='out_of_stock' and new.stock_status=old.stock_status then
      new.is_in_stock:=false; -- retain a manual stop-sale flag
    else new.stock_status:=case when new.stock_quantity<=10 then 'low_stock' else 'in_stock' end; new.is_in_stock:=true;
    end if;
  end if;
  return new;
end $$;
create trigger products_tracked_inventory before insert or update on public.products
for each row execute function public.sync_tracked_inventory();

create function public.reserve_checkout_stock() returns trigger
language plpgsql security definer set search_path=public as $$
declare p public.products; o public.orders;
begin
  select * into p from public.products where id=new.product_id for update;
  if not found or p.approval_status is distinct from 'approved' or not p.is_in_stock or p.stock_status='out_of_stock' then
    raise exception using errcode='P1002', message='Product is out of stock or unavailable'; end if;
  if p.stock_tracking_enabled then
    if p.stock_quantity is null or p.stock_quantity < new.quantity then
      raise exception using errcode='P1002', message='Insufficient stock'; end if;
    select * into o from public.orders where id=new.order_id;
    update public.products set stock_quantity=stock_quantity-new.quantity where id=p.id;
    insert into public.inventory_reservations(order_item_id,order_id,product_id,quantity,state,expires_at)
    values(new.id,new.order_id,new.product_id,new.quantity,
      case when o.payment_method='cod' or o.razorpay_payment_id is not null then 'committed' else 'held' end,
      case when o.payment_method='online' and o.razorpay_payment_id is null then o.placed_at+interval '20 minutes' else null end);
  end if;
  return new;
end $$;
create trigger order_items_reserve_stock after insert on public.order_items
for each row execute function public.reserve_checkout_stock();
create function public.finish_checkout_stock() returns trigger
language plpgsql security definer set search_path=public as $$
declare r public.inventory_reservations;
begin
  if new.status='cancelled' and old.status in ('placed','packed') and old.picked_up_at is null then
    -- Always lock parent products in the same order, including multi-pack lines.
    perform 1 from public.products where id in(select product_id from inventory_reservations where order_id=new.id and state in ('held','committed')) order by id for update;
    for r in select * from inventory_reservations where order_id=new.id and state in ('held','committed') order by product_id,order_item_id for update loop
      update inventory_reservations set state='released',expires_at=null where order_item_id=r.order_item_id;
      update public.products set stock_quantity=stock_quantity+r.quantity where id=r.product_id;
    end loop;
  elsif new.status in ('out_for_delivery','delivered','failed') then
    update inventory_reservations set state='consumed',expires_at=null where order_id=new.id and state in ('held','committed');
  elsif new.razorpay_payment_id is not null then
    update inventory_reservations set state='committed',expires_at=null where order_id=new.id and state='held';
  end if;
  return new;
end $$;
create trigger orders_finish_inventory after update of status,razorpay_payment_id on public.orders
for each row execute function public.finish_checkout_stock();

-- Marker used by the backend to fail closed before schema activation.
create function public.checkout_eligibility_version() returns integer language sql stable as $$ select 1 $$;
revoke all on function public.checkout_assert_store(uuid,uuid,uuid) from public;
revoke all on function public.checkout_clock() from public;
revoke all on function public.guard_checkout_order() from public;
revoke all on function public.sync_tracked_inventory() from public;
revoke all on function public.reserve_checkout_stock() from public;
revoke all on function public.finish_checkout_stock() from public;
revoke all on function public.checkout_eligibility_version() from public;
grant execute on function public.checkout_eligibility_version() to service_role;

create or replace function public.snapshot_order_item_variant() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  product public.products;
  variant public.product_variants;
  price numeric;
  mrp numeric;
  pack text;
  seller uuid;
begin
  select * into product from public.products where id = new.product_id for update;
  if not found or not product.is_in_stock or product.stock_status='out_of_stock' or product.approval_status is distinct from 'approved' then
    raise exception 'Product unavailable';
  end if;
  select store_id into seller from public.orders where id = new.order_id;
  if seller is distinct from product.store_id then raise exception 'Product does not belong to the order store'; end if;
  if new.variant_id is not null then
    select * into variant from public.product_variants
      where id = new.variant_id and product_id = new.product_id for share;
    if not found then raise exception 'Variant unavailable'; end if;
    price := variant.price;
    mrp := greatest(price, coalesce(variant.original_price, price));
    pack := trim_scale(variant.quantity::numeric)::text || ' ' || case when variant.unit_type = 'l' then 'L' else variant.unit_type::text end;
  else
    -- Preserve the base-product contract for products without packs and old clients.
    price := product.price;
    mrp := greatest(price, coalesce(product.original_price, price));
    pack := coalesce(product.unit, '');
  end if;
  if new.unit_price_at_order is distinct from price
     or (new.unit_at_order is not null and new.unit_at_order is distinct from pack) then
    raise exception using errcode = '40001', message = 'Pack changed during checkout';
  end if;
  new.unit_price_at_order := price;
  new.unit_at_order := pack;
  new.variant_mrp_at_order := mrp;
  return new;
end $$;

create or replace function create_order(
  p_customer_id uuid,
  p_store_id uuid,
  p_address_id uuid,
  p_item_total numeric,
  p_delivery_fee numeric,
  p_commission_amount numeric,
  p_total numeric,
  p_items jsonb,
  p_promo_code_id uuid default null,
  p_discount_amount numeric default 0,
  p_payment_method text default 'cod',
  p_handling_fee numeric default 0
)
returns orders
language plpgsql
as $$
declare
  v_order orders;
  v_item jsonb;
begin
  perform 1 from public.products where id in(select (value->>'product_id')::uuid from jsonb_array_elements(p_items)) order by id for update;
  insert into orders (
    customer_id, store_id, address_id, status,
    item_total, delivery_fee, commission_amount, total,
    promo_code_id, discount_amount, payment_method, handling_fee
  ) values (
    p_customer_id, p_store_id, p_address_id, 'placed',
    p_item_total, p_delivery_fee, p_commission_amount, p_total,
    p_promo_code_id, p_discount_amount, p_payment_method, p_handling_fee
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order)
    values (
      v_order.id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price_at_order')::numeric,
      (v_item->>'variant_id')::uuid,
      v_item->>'unit_at_order',
      (v_item->>'variant_mrp_at_order')::numeric
    );
  end loop;

  if p_promo_code_id is not null then
    insert into promo_redemptions (promo_code_id, customer_id, order_id, discount_amount)
    values (p_promo_code_id, p_customer_id, v_order.id, p_discount_amount);
    update promo_codes set times_used = times_used + 1 where id = p_promo_code_id;
  end if;

  return v_order;
end;
$$;

-- Trip legs' own order rows keep handling_fee at its column default (0) —
-- the fee is charged once per checkout at the trip level (same reasoning
-- delivery_fee already follows: the trip's own row carries the real fee,
-- each leg's order row carries 0 so a per-leg sum never double-counts it).
create or replace function create_trip_orders(
  p_customer_id uuid,
  p_address_id uuid,
  p_delivery_fee numeric,
  p_item_total numeric,
  p_total numeric,
  p_legs jsonb,
  p_promo_code_id uuid default null,
  p_discount_amount numeric default 0,
  p_payment_method text default 'cod',
  p_handling_fee numeric default 0
)
returns trips
language plpgsql
as $$
declare
  v_trip trips;
  v_leg jsonb;
  v_order orders;
  v_item jsonb;
begin
  perform 1 from public.products where id in(
    select (item->>'product_id')::uuid from jsonb_array_elements(p_legs) leg,
      lateral jsonb_array_elements(leg->'items') item) order by id for update;
  insert into trips (
    customer_id, address_id, delivery_fee, item_total, total, status,
    promo_code_id, discount_amount, handling_fee
  ) values (
    p_customer_id, p_address_id, p_delivery_fee, p_item_total, p_total, 'placed',
    p_promo_code_id, p_discount_amount, p_handling_fee
  )
  returning * into v_trip;

  for v_leg in select * from jsonb_array_elements(p_legs)
  loop
    insert into orders (
      customer_id, store_id, address_id, status, trip_id,
      item_total, delivery_fee, commission_amount, total, payment_method
    ) values (
      p_customer_id,
      (v_leg->>'store_id')::uuid,
      p_address_id,
      'placed',
      v_trip.id,
      (v_leg->>'item_total')::numeric,
      0,
      (v_leg->>'commission_amount')::numeric,
      (v_leg->>'item_total')::numeric,
      p_payment_method
    )
    returning * into v_order;

    for v_item in select * from jsonb_array_elements(v_leg->'items')
    loop
      insert into order_items (order_id, product_id, quantity, unit_price_at_order, variant_id, unit_at_order, variant_mrp_at_order)
      values (
        v_order.id,
        (v_item->>'product_id')::uuid,
        (v_item->>'quantity')::int,
        (v_item->>'unit_price_at_order')::numeric,
        (v_item->>'variant_id')::uuid,
        v_item->>'unit_at_order',
        (v_item->>'variant_mrp_at_order')::numeric
      );
    end loop;
  end loop;

  if p_promo_code_id is not null then
    insert into promo_redemptions (promo_code_id, customer_id, trip_id, discount_amount)
    values (p_promo_code_id, p_customer_id, v_trip.id, p_discount_amount);
    update promo_codes set times_used = times_used + 1 where id = p_promo_code_id;
  end if;

  return v_trip;
end;
$$;

-- Re-apply the same search_path hardening 025_harden_functions_security.sql
-- put on the old signatures — a fresh `create or replace` doesn't carry
-- that setting forward on its own.
alter function public.create_order(
  uuid, uuid, uuid, numeric, numeric, numeric, numeric, jsonb, uuid, numeric, text, numeric
) set search_path = public;

alter function public.create_trip_orders(
  uuid, uuid, numeric, numeric, numeric, jsonb, uuid, numeric, text, numeric
) set search_path = public;

-- Payment and timeout lock the same trip/order rows. A late capture never
-- resurrects released inventory; the backend refunds the saved payment.
create function public.settle_checkout_payment(p_order_id uuid,p_trip_id uuid,p_payment_id text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare o public.orders; t public.trips; rejected boolean; old_payment text;
begin
  if (p_order_id is null)=(p_trip_id is null) or nullif(p_payment_id,'') is null then raise exception 'Invalid payment target'; end if;
  if p_trip_id is not null then
    select * into t from public.trips where id=p_trip_id for update;
    if not found then raise exception 'Trip not found'; end if;
    old_payment:=t.razorpay_payment_id;
    if old_payment is not null then
      if old_payment<>p_payment_id then raise exception 'Payment conflict'; end if;
      return jsonb_build_object('accepted',not t.checkout_payment_rejected,'total',t.total);
    end if;
    perform 1 from public.orders where trip_id=t.id order by id for update;
    rejected:=t.status='cancelled' or exists(select 1 from public.orders where trip_id=t.id and
      (status='cancelled' or (payment_method='online' and razorpay_payment_id is null and placed_at+interval '20 minutes'<=checkout_clock())));
    if rejected then
      perform 1 from public.products where id in(select product_id from inventory_reservations where order_id in(select id from public.orders where trip_id=t.id) and state in ('held','committed')) order by id for update;
      update public.orders set status='cancelled',cancel_reason='Payment arrived after checkout closed.' where trip_id=t.id and status in ('placed','packed');
    end if;
    update public.trips set razorpay_payment_id=p_payment_id,checkout_payment_rejected=rejected,
      status=case when rejected then 'cancelled' else status end where id=t.id;
    update public.orders set razorpay_payment_id=p_payment_id,checkout_payment_rejected=rejected where trip_id=t.id;
    return jsonb_build_object('accepted',not rejected,'total',t.total);
  else
    select * into o from public.orders where id=p_order_id for update;
    if not found or o.trip_id is not null then raise exception 'Use the trip payment target'; end if;
    if o.razorpay_payment_id is not null then
      if o.razorpay_payment_id<>p_payment_id then raise exception 'Payment conflict'; end if;
      return jsonb_build_object('accepted',not o.checkout_payment_rejected,'total',o.total);
    end if;
    rejected:=o.status='cancelled' or (o.payment_method='online' and o.placed_at+interval '20 minutes'<=checkout_clock());
    if rejected and o.status in ('placed','packed') then
      update public.orders set status='cancelled',cancel_reason='Payment arrived after checkout closed.' where id=o.id;
    end if;
    update public.orders set razorpay_payment_id=p_payment_id,checkout_payment_rejected=rejected where id=o.id;
    return jsonb_build_object('accepted',not rejected,'total',o.total);
  end if;
end $$;
create function public.expire_checkout_reservations() returns jsonb
language plpgsql security definer set search_path=public as $$
declare t public.trips; o public.orders; rows jsonb:='[]'; affected jsonb;
begin
  for t in select * from public.trips where status='placed' and razorpay_payment_id is null
    and exists(select 1 from public.orders where trip_id=trips.id and payment_method='online' and placed_at+interval '20 minutes'<=checkout_clock())
    order by id limit 100 for update skip locked loop
    perform 1 from public.orders where trip_id=t.id order by id for update;
    perform 1 from public.products where id in(select product_id from inventory_reservations where order_id in(select id from public.orders where trip_id=t.id) and state='held') order by id for update;
    with cancelled as (
      update public.orders set status='cancelled',cancel_reason='Payment was not completed in time.'
      where trip_id=t.id and status='placed' and razorpay_payment_id is null returning id,customer_id
    ) select coalesce(jsonb_agg(to_jsonb(cancelled)),'[]') into affected from cancelled;
    rows:=rows||affected;
    update public.trips set status='cancelled' where id=t.id;
  end loop;
  for o in select * from public.orders where trip_id is null and status='placed' and payment_method='online' and razorpay_payment_id is null
    and placed_at+interval '20 minutes'<=checkout_clock() order by id limit 100 for update skip locked loop
    update public.orders set status='cancelled',cancel_reason='Payment was not completed in time.' where id=o.id;
    rows:=rows||jsonb_build_array(jsonb_build_object('id',o.id,'customer_id',o.customer_id));
  end loop;
  return rows;
end $$;
revoke all on function public.settle_checkout_payment(uuid,uuid,text) from public;
revoke all on function public.expire_checkout_reservations() from public;
grant execute on function public.settle_checkout_payment(uuid,uuid,text) to service_role;
grant execute on function public.expire_checkout_reservations() to service_role;
-- Supabase may grant functions/tables to API roles through default privileges.
-- Explicit role revocation keeps settlement, expiry and order RPCs backend-only.
revoke all on table public.inventory_reservations from public,anon,authenticated;
grant all on table public.inventory_reservations to service_role;
revoke all on function public.checkout_clock() from anon,authenticated;
revoke all on function public.checkout_time_minutes(text) from public,anon,authenticated;
revoke all on function public.checkout_assert_store(uuid,uuid,uuid) from anon,authenticated;
revoke all on function public.guard_checkout_order() from anon,authenticated;
revoke all on function public.sync_tracked_inventory() from anon,authenticated;
revoke all on function public.reserve_checkout_stock() from anon,authenticated;
revoke all on function public.finish_checkout_stock() from anon,authenticated;
revoke all on function public.snapshot_order_item_variant() from public,anon,authenticated;
revoke all on function public.checkout_eligibility_version() from anon,authenticated;
revoke all on function public.settle_checkout_payment(uuid,uuid,text) from anon,authenticated;
revoke all on function public.expire_checkout_reservations() from anon,authenticated;
revoke all on function public.create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric) from public,anon,authenticated;
revoke all on function public.create_trip_orders(uuid,uuid,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric) from public,anon,authenticated;
grant execute on function public.create_order(uuid,uuid,uuid,numeric,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric) to service_role;
grant execute on function public.create_trip_orders(uuid,uuid,numeric,numeric,numeric,jsonb,uuid,numeric,text,numeric) to service_role;
notify pgrst,'reload schema';
commit;

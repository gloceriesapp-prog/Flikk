-- Every foreign key below had no covering index (Supabase performance
-- advisor, 27 findings) — a real concurrency/scale concern, not cosmetic:
-- every RLS policy that joins through a FK (e.g. orders_store_owner_read's
-- `store_id IN (select id from stores where owner_user_id = auth.uid())`,
-- order_items_via_order's join back to orders) and every hot-path lookup
-- (a store's own product list, a customer's own order history, a rider's
-- own earnings) does a sequential scan without one. That's fine at today's
-- row counts; it becomes real lock contention and slow queries the moment
-- concurrent orders are actually flowing. Plain CREATE INDEX (not
-- CONCURRENTLY) is safe here — every table involved is still small enough
-- that a brief write-lock during index creation is a non-event.

create index if not exists addresses_user_id_idx on public.addresses (user_id);
create index if not exists addresses_zone_id_idx on public.addresses (zone_id);

create index if not exists festival_section_products_product_id_idx on public.festival_section_products (product_id);

create index if not exists home_tab_banners_home_tab_id_idx on public.home_tab_banners (home_tab_id);

create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists order_items_product_id_idx on public.order_items (product_id);

create index if not exists orders_address_id_idx on public.orders (address_id);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_promo_code_id_idx on public.orders (promo_code_id);
create index if not exists orders_rider_id_idx on public.orders (rider_id);
create index if not exists orders_store_id_idx on public.orders (store_id);

create index if not exists products_store_id_idx on public.products (store_id);
create index if not exists products_sub_category_id_idx on public.products (sub_category_id);

create index if not exists promo_redemptions_customer_id_idx on public.promo_redemptions (customer_id);
create index if not exists promo_redemptions_order_id_idx on public.promo_redemptions (order_id);
create index if not exists promo_redemptions_trip_id_idx on public.promo_redemptions (trip_id);

create index if not exists referral_signups_referral_code_id_idx on public.referral_signups (referral_code_id);

create index if not exists reviews_customer_id_idx on public.reviews (customer_id);
create index if not exists reviews_store_id_idx on public.reviews (store_id);

create index if not exists rider_earnings_order_id_idx on public.rider_earnings (order_id);
create index if not exists rider_earnings_rider_id_idx on public.rider_earnings (rider_id);

create index if not exists stores_owner_user_id_idx on public.stores (owner_user_id);
create index if not exists stores_zone_id_idx on public.stores (zone_id);

create index if not exists trips_address_id_idx on public.trips (address_id);
create index if not exists trips_customer_id_idx on public.trips (customer_id);
create index if not exists trips_promo_code_id_idx on public.trips (promo_code_id);

create index if not exists wishlist_items_product_id_idx on public.wishlist_items (product_id);

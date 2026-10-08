-- Fake test data for LOCAL and STAGING databases only. Never run against production.
-- Idempotent: re-running it updates the same rows (fixed UUIDs) instead of duplicating them.
-- Apply after all migrations: node backend/scripts/db-migrate.mjs --seed (see ENVIRONMENTS.md).
\set ON_ERROR_STOP on
DO $$ BEGIN
  IF current_database() = 'postgres' AND EXISTS (SELECT 1 FROM public.orders WHERE status = 'delivered' LIMIT 1)
     AND (SELECT count(*) FROM public.orders) > 50 THEN
    RAISE EXCEPTION 'This database already has real-looking order history; refusing to seed.';
  END IF;
END $$;

BEGIN;

-- Zone: Kaup, near Udupi (matches the production zone name so app copy looks the same).
INSERT INTO public.zones (id, name, slug, is_active)
VALUES ('00000000-0000-4000-a000-000000000001', 'Kaup, Udupi (test)', 'kaup-udupi-test', true)
ON CONFLICT (id) DO UPDATE SET name = excluded.name, is_active = true;

-- Two fake store owners. They never log in; real owner logins come from the partner app.
INSERT INTO public.users (id, phone, name, role, is_approved) VALUES
  ('00000000-0000-4000-a000-000000000101', '+910000000101', 'Test Owner One', 'store_owner', true),
  ('00000000-0000-4000-a000-000000000102', '+910000000102', 'Test Owner Two', 'store_owner', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stores (id, owner_user_id, zone_id, name, category, district, city, state, country,
                           lat, lng, is_active, open_time, close_time, phone)
VALUES
  ('00000000-0000-4000-a000-000000000201', '00000000-0000-4000-a000-000000000101',
   '00000000-0000-4000-a000-000000000001', 'Test Kirana Kaup', 'Kirana & Grocery', 'Udupi', 'Kaup', 'Karnataka', 'India',
   13.2158, 74.7431, true, '6:00 AM', '10:00 PM', '+910000000101'),
  ('00000000-0000-4000-a000-000000000202', '00000000-0000-4000-a000-000000000102',
   '00000000-0000-4000-a000-000000000001', 'Test Fresh Mart', 'Fruits & Vegetables', 'Udupi', 'Kaup', 'Karnataka', 'India',
   13.2200, 74.7480, true, '7:00 AM', '9:30 PM', '+910000000102')
ON CONFLICT (id) DO UPDATE SET is_active = true, lat = excluded.lat, lng = excluded.lng;

-- Products: one default pack each, with stock counts so every pack is orderable.
WITH items(n, store, name, unit, price, mrp, category, qty, unit_type, stock) AS (VALUES
  (1,  '201', 'Toor Dal 1kg',           '1 kg',    165, 180, 'Grocery',    1,   'kg', 40),
  (2,  '201', 'Sona Masoori Rice 5kg',  '5 kg',    420, 460, 'Grocery',    5,   'kg', 25),
  (3,  '201', 'Sunflower Oil 1L',       '1 L',     145, 160, 'Grocery',    1,   'l',  30),
  (4,  '201', 'Sugar 1kg',              '1 kg',     48,  52, 'Grocery',    1,   'kg', 50),
  (5,  '201', 'Tea Powder 250g',        '250 g',   120, 135, 'Grocery',    250, 'g',  20),
  (6,  '201', 'Milk 500ml',             '500 ml',   26,  27, 'Dairy',      500, 'ml', 60),
  (7,  '201', 'Curd 400g',              '400 g',    35,  38, 'Dairy',      400, 'g',  30),
  (8,  '201', 'Bread 400g',             '400 g',    45,  50, 'Bakery',     400, 'g',  20),
  (9,  '201', 'Bath Soap 100g',         '100 g',    40,  45, 'Household',  100, 'g',  40),
  (10, '201', 'Dishwash Bar 200g',      '200 g',    20,  22, 'Household',  200, 'g',  40),
  (11, '202', 'Tomato 1kg',             '1 kg',     28,  32, 'Vegetables', 1,   'kg', 50),
  (12, '202', 'Onion 1kg',              '1 kg',     35,  40, 'Vegetables', 1,   'kg', 50),
  (13, '202', 'Potato 1kg',             '1 kg',     32,  36, 'Vegetables', 1,   'kg', 50),
  (14, '202', 'Banana (Dozen)',         '12 pcs',   60,  70, 'Fruits',     12,  'pc', 30),
  (15, '202', 'Apple 1kg',              '1 kg',    180, 200, 'Fruits',     1,   'kg', 20),
  (16, '202', 'Coconut',                '1 pc',     40,  45, 'Vegetables', 1,   'pc', 40),
  (17, '202', 'Green Chilli 250g',      '250 g',    15,  18, 'Vegetables', 250, 'g',  30),
  (18, '202', 'Coriander Bunch',        '1 bunch',  10,  12, 'Vegetables', 1,   'pc', 30),
  (19, '202', 'Carrot 500g',            '500 g',    30,  34, 'Vegetables', 500, 'g',  30),
  (20, '202', 'Lemon (6 pcs)',          '6 pcs',    20,  24, 'Fruits',     6,   'pc', 30)
), p AS (
  INSERT INTO public.products (id, store_id, name, unit, price, original_price, category, approval_status,
                               stock_tracking_enabled, stock_quantity)
  SELECT ('00000000-0000-4000-a000-' || lpad((300 + n)::text, 12, '0'))::uuid,
         ('00000000-0000-4000-a000-000000000' || store)::uuid, name, unit, price, mrp, category, 'approved', true, stock
  FROM items
  ON CONFLICT (id) DO UPDATE SET price = excluded.price, stock_quantity = excluded.stock_quantity, approval_status = 'approved'
  RETURNING id
)
INSERT INTO public.product_variants (id, product_id, unit_type, quantity, price, original_price, is_default, stock_quantity)
SELECT ('00000000-0000-4000-a000-' || lpad((500 + n)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-a000-' || lpad((300 + n)::text, 12, '0'))::uuid,
       unit_type, qty, price, mrp, true, stock
FROM items
ON CONFLICT (id) DO UPDATE SET price = excluded.price, stock_quantity = excluded.stock_quantity;

COMMIT;

SELECT (SELECT count(*) FROM public.stores WHERE zone_id = '00000000-0000-4000-a000-000000000001') AS test_stores,
       (SELECT count(*) FROM public.products WHERE store_id IN ('00000000-0000-4000-a000-000000000201','00000000-0000-4000-a000-000000000202')) AS test_products;

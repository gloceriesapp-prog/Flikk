-- 023_promo_order_functions.sql added p_promo_code_id/p_discount_amount to
-- create_order/create_trip_orders. Postgres treats a changed parameter
-- list as a new overload, not a replacement — `create or replace` only
-- replaces a function with the exact same signature. The pre-023
-- 8-arg/6-arg versions are still sitting in the DB alongside the new
-- 10-arg/8-arg ones. Every real caller (routes/orders.ts, routes/trips.ts)
-- always passes all params by name so it resolves to the new versions
-- unambiguously, but the dead overloads are still worth dropping — leaving
-- them around is exactly the kind of drift that eventually causes a
-- "could not choose the best candidate function" error the moment a
-- caller ever omits one of the newer params.

drop function if exists create_order(uuid, uuid, uuid, numeric, numeric, numeric, numeric, jsonb);
drop function if exists create_trip_orders(uuid, uuid, numeric, numeric, numeric, jsonb);

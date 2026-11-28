-- Delivery window per product category (e.g. "Non Veg" 45-60 min, cut
-- fresh). Keyed by products.category text, so it works for categories that
-- have no row in public.categories.
--   * category_delivery_windows: what the app shows (min-max + a short note)
--     and what an order containing that category promises (the max).
--   * When an order item is added, its category's max raises the order's
--     recorded promise (and its trip's), never lowers it. The placement
--     snapshot (migration 061) stays immutable otherwise: only this trigger,
--     inside the inserting transaction, may push it later.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE TABLE IF NOT EXISTS public.category_delivery_windows(
 category text PRIMARY KEY CHECK(length(btrim(category)) BETWEEN 1 AND 60),
 min_minutes integer NOT NULL CHECK(min_minutes BETWEEN 1 AND 240),
 max_minutes integer NOT NULL CHECK(max_minutes BETWEEN 1 AND 240),
 note text CHECK(note IS NULL OR length(note) <= 30),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by text,
 CHECK(max_minutes >= min_minutes)
);
ALTER TABLE public.category_delivery_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.category_delivery_windows FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.category_delivery_windows TO service_role;

-- Same snapshot as 061, plus one narrow exception: a later promise may be
-- written while app.extend_delivery_estimate is on (set only by
-- extend_delivery_estimate_for_item below, transaction-local).
CREATE OR REPLACE FUNCTION public.snapshot_delivery_estimate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  minutes integer;
  deadline timestamptz;
begin
  if tg_op = 'UPDATE' then
    if new.estimated_delivery_minutes is distinct from old.estimated_delivery_minutes
       or new.estimated_delivery_at is distinct from old.estimated_delivery_at then
      if coalesce(current_setting('app.extend_delivery_estimate', true), '') = 'on'
         and new.estimated_delivery_minutes > coalesce(old.estimated_delivery_minutes, 0)
         and new.estimated_delivery_at >= coalesce(old.estimated_delivery_at, new.estimated_delivery_at) then
        return new;
      end if;
      raise exception 'The delivery estimate recorded at placement cannot be changed';
    end if;
    return new;
  end if;
  if tg_table_name = 'orders' then
    if new.trip_id is not null then
      select estimated_delivery_minutes, estimated_delivery_at into minutes, deadline
      from public.trips where id = new.trip_id;
    end if;
    if minutes is null then
      select estimated_delivery_minutes into strict minutes from public.delivery_settings;
      deadline := new.placed_at + make_interval(mins => minutes);
    end if;
  else
    select estimated_delivery_minutes into strict minutes from public.delivery_settings;
    deadline := new.created_at + make_interval(mins => minutes);
  end if;
  new.estimated_delivery_minutes := minutes;
  new.estimated_delivery_at := deadline;
  return new;
end;
$$;
REVOKE ALL ON FUNCTION public.snapshot_delivery_estimate() FROM PUBLIC;

-- An item whose category has a longer window pushes the whole order's
-- promise to that window's max: the order, its trip, and every leg of that
-- trip (one delivery arrives together, so the slowest item sets the time).
CREATE OR REPLACE FUNCTION public.extend_delivery_estimate_for_item() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare
  window_max integer;
  order_trip uuid;
begin
  select w.max_minutes into window_max
  from public.products p join public.category_delivery_windows w on w.category = p.category
  where p.id = new.product_id;
  if window_max is null then return null; end if;

  select trip_id into order_trip from public.orders where id = new.order_id;
  perform set_config('app.extend_delivery_estimate', 'on', true);
  if order_trip is not null then
    update public.trips set estimated_delivery_minutes = window_max,
      estimated_delivery_at = created_at + make_interval(mins => window_max)
    where id = order_trip and coalesce(estimated_delivery_minutes, 0) < window_max;
    update public.orders o set estimated_delivery_minutes = t.estimated_delivery_minutes, estimated_delivery_at = t.estimated_delivery_at
    from public.trips t
    where o.trip_id = order_trip and t.id = order_trip and coalesce(o.estimated_delivery_minutes, 0) < t.estimated_delivery_minutes;
  else
    update public.orders set estimated_delivery_minutes = window_max,
      estimated_delivery_at = placed_at + make_interval(mins => window_max)
    where id = new.order_id and coalesce(estimated_delivery_minutes, 0) < window_max;
  end if;
  perform set_config('app.extend_delivery_estimate', '', true);
  return null;
end;
$$;
REVOKE ALL ON FUNCTION public.extend_delivery_estimate_for_item() FROM PUBLIC;

DROP TRIGGER IF EXISTS order_items_extend_delivery_estimate ON public.order_items;
CREATE TRIGGER order_items_extend_delivery_estimate
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.extend_delivery_estimate_for_item();

NOTIFY pgrst, 'reload schema';
COMMIT;

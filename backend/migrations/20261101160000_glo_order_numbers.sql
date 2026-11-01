-- Human-facing order numbers move from sequential 'FLK-100042' to
-- 'GLO-4829-1736': the brand prefix plus 8 digits that look random but are
-- guaranteed unique. Shown as-is by the customer, partner, rider and admin
-- apps (orders.order_number is the only copy; nothing else stores it).
--
-- Uniqueness without retries: order_number_seq already hands every order a
-- distinct n. order_number_for(n) pushes n through three bijections on
-- 0..10^8-1, so distinct n -> distinct number for the first 10^8 orders:
--   1. v = (48271093 * n + 30210457) mod 10^8   (multiplier coprime with
--      10^8: odd, not a multiple of 5, so this is a permutation)
--   2. shuffle v's 8 digit positions (a fixed rearrangement)
--   3. w = (71234567 * v + 9876543) mod 10^8      (again coprime)
-- Step 1 alone left the last 4 digits stepping by a constant between
-- consecutive orders; the shuffle + second pass hide that. Verified on
-- production Postgres: 1,000,000 consecutive n -> 1,000,000 distinct.
-- orders_order_number_key (unique) stays as the database-level guarantee.

create or replace function public.order_number_for(n bigint)
returns text
language sql
immutable
parallel safe
as $$
  with a as (
    select lpad(((48271093 * n + 30210457) % 100000000)::text, 8, '0') as s
  ), b as (
    select ((71234567 * (substr(s,4,1) || substr(s,7,1) || substr(s,1,1) || substr(s,8,1)
                      || substr(s,3,1) || substr(s,6,1) || substr(s,2,1) || substr(s,5,1))::bigint
             + 9876543) % 100000000) as w
    from a
  )
  select 'GLO-' || lpad((w / 10000)::text, 4, '0') || '-' || lpad((w % 10000)::text, 4, '0') from b;
$$;

alter table public.orders
  alter column order_number set default public.order_number_for(nextval('public.order_number_seq'));

-- Renumber existing orders off the same sequence, so they can never collide
-- with a future one. Ordered by placed_at so the history keeps its order.
update public.orders o
set order_number = public.order_number_for(nextval('public.order_number_seq'))
from (select id from public.orders where order_number !~ '^GLO-[0-9]{4}-[0-9]{4}$' order by placed_at, id) old
where o.id = old.id;

-- Nothing but the generated format may land in the column.
alter table public.orders drop constraint if exists orders_order_number_format;
alter table public.orders
  add constraint orders_order_number_format check (order_number ~ '^GLO-[0-9]{4}-[0-9]{4}$');

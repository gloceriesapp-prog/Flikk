-- One admin-managed browsing estimate, snapshotted at order placement.
-- Historical rows stay null: there was no global promise recorded for them.
begin;

alter table public.delivery_settings
  add column estimated_delivery_minutes integer not null default 35
  check (estimated_delivery_minutes between 1 and 240);
alter table public.orders
  add column estimated_delivery_minutes integer check (estimated_delivery_minutes between 1 and 240),
  add column estimated_delivery_at timestamptz;
alter table public.trips
  add column estimated_delivery_minutes integer check (estimated_delivery_minutes between 1 and 240),
  add column estimated_delivery_at timestamptz;

create function public.snapshot_delivery_estimate() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  minutes integer;
  deadline timestamptz;
begin
  if tg_op = 'UPDATE' then
    if new.estimated_delivery_minutes is distinct from old.estimated_delivery_minutes
       or new.estimated_delivery_at is distinct from old.estimated_delivery_at then
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
revoke all on function public.snapshot_delivery_estimate() from public;

create trigger orders_snapshot_delivery_estimate
before insert or update of estimated_delivery_minutes, estimated_delivery_at on public.orders
for each row execute function public.snapshot_delivery_estimate();
create trigger trips_snapshot_delivery_estimate
before insert or update of estimated_delivery_minutes, estimated_delivery_at on public.trips
for each row execute function public.snapshot_delivery_estimate();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
       and schemaname = 'public' and tablename = 'delivery_settings') then
    alter publication supabase_realtime add table public.delivery_settings;
  end if;
end;
$$;
commit;

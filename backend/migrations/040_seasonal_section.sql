-- Real admin control over the customer app's Home "All" tab seasonal
-- poster + tile grid (apps/customer/src/screens/home/seasonal/) — was
-- fully hardcoded in that app's own data.ts before this, zero admin
-- control. Same public-read-only convention as festival_sections/
-- home_tabs: every app needs this regardless of auth state, only admin's
-- own service-role client ever writes.

create table seasonal_banner (
  id uuid primary key default gen_random_uuid(),
  banner_image_url text,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into seasonal_banner (banner_image_url, is_active) values (null, false);

create table seasonal_tiles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  bg_color text not null default '#F4F1EA',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table seasonal_banner enable row level security;
alter table seasonal_tiles enable row level security;

create policy seasonal_banner_read_all on seasonal_banner for select using (true);
create policy seasonal_tiles_read_all on seasonal_tiles for select using (true);

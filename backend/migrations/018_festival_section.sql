-- Admin-curated "Festival Picks" row on Home's "All" tab (apps/customer's
-- FestivalPicksSection.tsx, currently hardcoded to dummyFestivalProducts.ts
-- with no real per-store "festival items" tag to read a real version from).
-- A founder edits the title and picks real products from the existing
-- products table via admin's own Festival Section screen — same "curated
-- shelf of real products" shape as home_tab_tiles/home_tab_banners, just
-- referencing real product rows instead of a name+image pair.
--
-- One row is enough at this scale (single zone, one festival live at a
-- time) but not schema-enforced as a singleton — is_active lets a founder
-- prep next festival's row ahead of time before flipping it live, same
-- "draft vs published" idea stores.is_active already uses elsewhere.
-- FestivalPicksSection.tsx renders nothing when no row is active, same
-- "no active row = section off" convention as seasonal/data.ts.
create table festival_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table festival_section_products (
  id uuid primary key default gen_random_uuid(),
  festival_section_id uuid not null references festival_sections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  sort_order int not null default 0,
  unique (festival_section_id, product_id)
);

alter table festival_sections enable row level security;
create policy festival_sections_read_active on festival_sections for select using (is_active = true);

alter table festival_section_products enable row level security;
create policy festival_section_products_read_all on festival_section_products for select using (true);

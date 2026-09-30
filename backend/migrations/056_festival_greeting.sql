-- Editable "festival greeting" panel on Home (apps/customer). A founder
-- edits the title/tagline and the small list of shortcut categories from
-- admin's own Festival Greeting screen; is_active flips the whole panel on
-- or off without a code deploy.
--
-- Singleton (one row), same "one editable settings row" shape as
-- platform_settings (039) — but unlike platform_settings this needs a
-- PUBLIC read policy: the customer app itself hides the panel when
-- is_active=false, so the anon client must always be able to read the flag
-- (same public-read convention as festival_section_products, 018).
create table festival_greeting (
  id uuid primary key default gen_random_uuid(),
  is_active boolean not null default true,
  title text not null default 'Happy Navratri',
  tagline text not null default 'Celebrate the season with fresh picks',
  categories jsonb not null default '[]'::jsonb, -- array of { "id": string, "title": string }
  updated_at timestamptz not null default now()
);

insert into festival_greeting (categories) values (
  '[{"id":"flowers","title":"Flowers, Cards & Mugs"},{"id":"stationery","title":"Pens & Stationery"},{"id":"chocolates","title":"Chocolates & Cakes"}]'::jsonb
);

alter table festival_greeting enable row level security;
create policy festival_greeting_read_all on festival_greeting for select using (true);

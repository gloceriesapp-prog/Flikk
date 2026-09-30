-- Admin-controllable Home layout (apps/customer "All" tab). One row per
-- section, keyed by a stable `key` the customer renderer maps to a component.
-- The founder controls, per section, WITHOUT a code deploy:
--   * enabled     — show / hide the whole section
--   * sort_index  — the order sections appear in (drag-reorder in admin)
--   * title       — heading override (NULL = use the component's own default)
--   * subtitle    — optional sub-copy (only sections with a subtitle slot use it)
--   * bg_color    — optional background/accent hex (NULL = component default)
--
-- Same "singleton settings row, PUBLIC read" convention as festival_greeting
-- (056) — the customer anon client must read every row (including disabled
-- ones: it hides them client-side), so RLS allows select to all. Writes are
-- admin-only via the Next.js service-role API route (never the anon client),
-- so no write policy is added here.
--
-- Seeded with the current hardcoded AllTabSections order so the very first
-- read reproduces today's layout exactly; new sections added in code later
-- just need a matching seed row (and fall back to a sensible default order
-- if none exists — the renderer keys off `key`, not off the row existing).

create table home_sections (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text,
  subtitle text,
  enabled boolean not null default true,
  sort_index integer not null,
  bg_color text,
  updated_at timestamptz not null default now()
);

alter table home_sections enable row level security;
create policy home_sections_read_all on home_sections for select using (true);

-- Current AllTabSections order. title left NULL where the component's own
-- default copy should win; set only where a distinct admin-facing name helps.
insert into home_sections (key, title, sort_index) values
  ('festival-greeting',   null,                 10),
  ('nearby-stores',       null,                 20),
  ('trending',            'Trending This Week', 30),
  ('most-bought',         'Most Bought',        40),
  ('category-sections',   null,                 50),
  ('deals-for-you',       'Deals for You',      60),
  ('top-rated-stores',    null,                 70),
  ('deals-section',       null,                 80),
  ('todays-best-deals',   'Today’s Best Deals', 90),
  ('price-drops',         'Biggest Price Drops',100),
  ('everyday-essentials', null,                 110),
  ('new-on-gloceries',    null,                 120),
  ('brand-footer',        null,                 130);

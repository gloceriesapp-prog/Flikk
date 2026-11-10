-- Product-card layout belongs to the Customer Home All tab.
ALTER TABLE public.home_sections ADD COLUMN display_layout text
  CHECK (display_layout IN ('horizontal', 'grid'));

-- Reuse a founder-created Taste of Udupi section and its picks if present.
INSERT INTO public.home_sections (key, title, enabled, sort_index, is_custom, pinned_only, display_layout)
SELECT 'custom-tasteofudupi', 'Taste of Udupi', true, 10, true, true, 'horizontal'
WHERE NOT EXISTS (
  SELECT 1 FROM public.home_sections
  WHERE is_custom AND lower(btrim(title)) = 'taste of udupi'
)
ON CONFLICT (key) DO NOTHING;

WITH taste AS (
  SELECT key FROM public.home_sections
  WHERE is_custom AND lower(btrim(title)) = 'taste of udupi'
  ORDER BY sort_index, key
  LIMIT 1
),
featured(key, position, title, layout) AS (
  VALUES
    ('quick-categories',     0, NULL, NULL),
    ('everyday-dairy',      10, 'Our Local Favourites', 'horizontal'),
    ((SELECT key FROM taste), 20, 'Taste of Udupi', 'horizontal'),
    ('category-sections',   30, NULL, NULL),
    ('preorders',           40, NULL, NULL),
    ('everyday-essentials', 50, 'Daily Essentials', 'grid'),
    ('nearby-stores',       60, NULL, NULL),
    ('deals-for-you',       70, 'Deals for You', 'grid'),
    ('price-drops',         80, NULL, NULL)
),
extras AS (
  SELECT s.key, 90 + (row_number() OVER (ORDER BY s.key = 'brand-footer', s.sort_index, s.key) - 1) * 10 AS position
  FROM public.home_sections s
  WHERE NOT EXISTS (SELECT 1 FROM featured f WHERE f.key = s.key)
), ordered AS (
  SELECT key, position, title, layout, true AS featured FROM featured
  UNION ALL
  SELECT key, position, NULL, NULL, false FROM extras
)
UPDATE public.home_sections s
SET sort_index = o.position::integer,
    title = COALESCE(o.title, s.title),
    display_layout = o.layout,
    enabled = CASE
      WHEN o.featured THEN true
      WHEN s.is_custom OR s.key IN ('brand-footer', 'festival-greeting') THEN s.enabled
      ELSE false
    END
FROM ordered o
WHERE s.key = o.key;

-- Namma Brands (2026-11-27): a Home block above the welcome card showing up to
-- six local brands, each a card with its name, 1-2 product photos and a price
-- pill (apps/customer/src/screens/home/namma-brands, GET /home/namma-brands).
--
-- 1. home_sections row 'namma-brands': enabled / schedule / header image reuse
--    the existing columns and admin Home Sections controls. Starts disabled.
--    banner_image_url = the header image (NULL = the built-in default).
-- 2. home_brand_cards: the cards, in order. product_ids = up to two product
--    rows whose photos the card shows (empty = the brand's top sellers near
--    the customer); pill_mode picks the pill: best discount or lowest price,
--    always computed from live prices (never stored).
--    Written only through the admin service-role API; the customer API reads
--    it with the service role. No anon / authenticated access.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

INSERT INTO public.home_sections (key, title, enabled, sort_index)
VALUES ('namma-brands', 'Namma Brands', false, 5)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.home_sections DROP CONSTRAINT home_sections_banner_image_url_check;
ALTER TABLE public.home_sections ADD CONSTRAINT home_sections_banner_image_url_check
  CHECK (banner_image_url IS NULL OR (
    (key IN ('preorders', 'price-drops', 'everyday-dairy', 'trending', 'most-bought',
             'deals-for-you', 'todays-best-deals', 'everyday-essentials', 'namma-brands')
      OR key ~ '^custom-[a-z0-9]{6,32}$')
    AND banner_image_url LIKE 'https://%' AND length(banner_image_url) <= 2048
  ));

CREATE TABLE public.home_brand_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title text CHECK (title IS NULL OR length(btrim(title)) BETWEEN 1 AND 60),
  product_ids uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(product_ids) <= 2),
  pill_mode text NOT NULL DEFAULT 'discount' CHECK (pill_mode IN ('discount', 'lowest_price')),
  sort_index integer NOT NULL CHECK (sort_index BETWEEN 0 AND 5),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sort_index)
);
CREATE INDEX home_brand_cards_brand ON public.home_brand_cards(brand_id);
ALTER TABLE public.home_brand_cards ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.home_brand_cards FROM anon, authenticated;
GRANT ALL ON public.home_brand_cards TO service_role;

-- Admin save: replace every card in one transaction, in the given order.
-- p_cards: [{brand_id, title, product_ids, pill_mode}], at most 6.
CREATE FUNCTION public.save_home_brand_cards(p_cards jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF jsonb_typeof(p_cards) <> 'array' OR jsonb_array_length(p_cards) > 6 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'At most 6 brand cards.';
  END IF;
  DELETE FROM public.home_brand_cards WHERE true;
  INSERT INTO public.home_brand_cards (brand_id, title, product_ids, pill_mode, sort_index)
  SELECT (c.value->>'brand_id')::uuid,
         NULLIF(btrim(c.value->>'title'), ''),
         COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(c.value->'product_ids', '[]'::jsonb))::uuid), '{}'),
         COALESCE(c.value->>'pill_mode', 'discount'),
         (c.ordinality - 1)::integer
  FROM jsonb_array_elements(p_cards) WITH ORDINALITY AS c(value, ordinality);
END $$;
REVOKE ALL ON FUNCTION public.save_home_brand_cards(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_home_brand_cards(jsonb) TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';

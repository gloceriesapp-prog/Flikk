-- Partner inventory includes pending/rejected/out-of-stock rows, unlike the
-- customer browse index. UUID keyset pages use a stable store-first index.
CREATE INDEX IF NOT EXISTS products_partner_store_page_idx
  ON public.products (store_id, id DESC);
-- Existing customer name index only covers approved rows. These indexes also
-- support literal substring searches across a merchant's unapproved catalogue.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE INDEX IF NOT EXISTS products_partner_name_search_idx
  ON public.products USING gin (name extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_partner_category_search_idx
  ON public.products USING gin (category extensions.gin_trgm_ops);

-- One catalogue tree (2026-11-04): Section → Category → Sub-category → Product,
-- the way Blinkit/Zepto file products.
--
-- 1. A product with a sub-category takes its category label from that
--    sub-category's parent (products.category feeds commission rates and the
--    chicken/veg options by name). Set on insert and whenever either column
--    is written, so admin, partner and backend writes all agree.
-- 2. Renaming a category relabels its products and carries its commission
--    rate over (unless the new name already has one). Moving a sub-category
--    to another category relabels its products.
-- 3. A sub-category (or a category, via its sub-categories) that still has
--    products cannot be deleted: products must be moved first instead of
--    silently dropping out of category browse.
-- 4. home_tabs.section_id: a Home tab linked to a Categories-page section
--    shows that section's categories as tiles (GET /home-tabs).
BEGIN;
SET LOCAL lock_timeout='5s';

CREATE OR REPLACE FUNCTION public.product_category_from_sub_category()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE parent text;
BEGIN
 IF NEW.sub_category_id IS NOT NULL THEN
  SELECT c.name INTO parent FROM sub_categories s JOIN categories c ON c.id=s.category_id WHERE s.id=NEW.sub_category_id;
  IF parent IS NOT NULL THEN NEW.category:=parent; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS products_category_from_sub_category ON public.products;
CREATE TRIGGER products_category_from_sub_category BEFORE INSERT OR UPDATE OF sub_category_id, category ON public.products
 FOR EACH ROW EXECUTE FUNCTION public.product_category_from_sub_category();

CREATE OR REPLACE FUNCTION public.relabel_products_for_category()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.name IS DISTINCT FROM OLD.name THEN
  UPDATE products SET category=NEW.name
   WHERE sub_category_id IN (SELECT id FROM sub_categories WHERE category_id=NEW.id) AND category IS DISTINCT FROM NEW.name;
  UPDATE category_commission_rates SET category=NEW.name, updated_at=now()
   WHERE category=OLD.name AND NOT EXISTS (SELECT 1 FROM category_commission_rates WHERE category=NEW.name);
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS categories_relabel_products ON public.categories;
CREATE TRIGGER categories_relabel_products AFTER UPDATE OF name ON public.categories
 FOR EACH ROW EXECUTE FUNCTION public.relabel_products_for_category();

CREATE OR REPLACE FUNCTION public.relabel_products_for_sub_category()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
  UPDATE products p SET category=c.name FROM categories c
   WHERE c.id=NEW.category_id AND p.sub_category_id=NEW.id AND p.category IS DISTINCT FROM c.name;
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS sub_categories_relabel_products ON public.sub_categories;
CREATE TRIGGER sub_categories_relabel_products AFTER UPDATE OF category_id ON public.sub_categories
 FOR EACH ROW EXECUTE FUNCTION public.relabel_products_for_sub_category();

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sub_category_id_fkey;
ALTER TABLE public.products ADD CONSTRAINT products_sub_category_id_fkey
 FOREIGN KEY (sub_category_id) REFERENCES public.sub_categories(id) ON DELETE RESTRICT;

ALTER TABLE public.home_tabs ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.category_sections(id) ON DELETE SET NULL;

-- Existing products filed under a sub-category take its parent's label now.
UPDATE public.products p SET category=c.name FROM public.sub_categories s JOIN public.categories c ON c.id=s.category_id
 WHERE p.sub_category_id=s.id AND p.category IS DISTINCT FROM c.name;

COMMIT;
NOTIFY pgrst, 'reload schema';

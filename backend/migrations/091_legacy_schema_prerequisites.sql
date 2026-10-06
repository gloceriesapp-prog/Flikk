-- Recover untracked legacy schema prerequisites. Existing tables/columns are preserved.
-- Canonical fresh-install order: after 006, before 007. Existing installations apply normally.
BEGIN;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text DEFAULT ('FLK-'||nextval('public.order_number_seq')) NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique ON public.orders(order_number);
CREATE TABLE IF NOT EXISTS public.store_onboarding_drafts (
 user_id uuid NOT NULL PRIMARY KEY REFERENCES public.users(id),
 store_name text,
 category text,
 district text,
 lat double precision,
 lng double precision,
 photo_url text,
 gst_number text,
 updated_at timestamp with time zone DEFAULT now() NOT NULL,
 submitted_at timestamp with time zone,
 address_line text
);
ALTER TABLE public.store_onboarding_drafts ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.store_onboarding_drafts FROM anon,authenticated;
GRANT ALL ON public.store_onboarding_drafts TO service_role;
CREATE TABLE IF NOT EXISTS public.category_sections (
 id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
 name text NOT NULL,
 sort_order integer DEFAULT 0 NOT NULL,
 created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.category_sections ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.category_sections FROM anon,authenticated;
GRANT ALL ON public.category_sections TO service_role;
CREATE TABLE IF NOT EXISTS public.categories (
 id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
 name text NOT NULL,
 image_url text,
 sort_order integer DEFAULT 0 NOT NULL,
 is_active boolean DEFAULT true NOT NULL,
 created_at timestamp with time zone DEFAULT now() NOT NULL,
 section_id uuid REFERENCES public.category_sections(id)
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.categories FROM anon,authenticated;
GRANT ALL ON public.categories TO service_role;
CREATE TABLE IF NOT EXISTS public.sub_categories (
 id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
 category_id uuid NOT NULL REFERENCES public.categories(id),
 name text NOT NULL,
 sort_order integer DEFAULT 0 NOT NULL,
 is_active boolean DEFAULT true NOT NULL,
 created_at timestamp with time zone DEFAULT now() NOT NULL,
 image_url text
);
ALTER TABLE public.sub_categories ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.sub_categories FROM anon,authenticated;
GRANT ALL ON public.sub_categories TO service_role;
CREATE TABLE IF NOT EXISTS public.home_tabs (
 id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
 name text NOT NULL,
 image_url text,
 sort_order integer DEFAULT 0 NOT NULL,
 is_active boolean DEFAULT true NOT NULL,
 created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.home_tabs ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.home_tabs FROM anon,authenticated;
GRANT ALL ON public.home_tabs TO service_role;
CREATE TABLE IF NOT EXISTS public.home_tab_tiles (
 id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
 home_tab_id uuid NOT NULL REFERENCES public.home_tabs(id),
 name text NOT NULL,
 image_url text,
 sort_order integer DEFAULT 0 NOT NULL,
 is_active boolean DEFAULT true NOT NULL,
 created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.home_tab_tiles ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.home_tab_tiles FROM anon,authenticated;
GRANT ALL ON public.home_tab_tiles TO service_role;
CREATE TABLE IF NOT EXISTS public.home_tab_banners (
 id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
 home_tab_id uuid NOT NULL REFERENCES public.home_tabs(id),
 image_url text NOT NULL,
 sort_order integer DEFAULT 0 NOT NULL,
 is_active boolean DEFAULT true NOT NULL,
 created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE public.home_tab_banners ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.home_tab_banners FROM anon,authenticated;
GRANT ALL ON public.home_tab_banners TO service_role;
CREATE TABLE IF NOT EXISTS public.product_variants (
 id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
 product_id uuid NOT NULL REFERENCES public.products(id),
 unit_type text NOT NULL,
 quantity numeric NOT NULL,
 price numeric NOT NULL,
 original_price numeric,
 is_default boolean DEFAULT false NOT NULL,
 created_at timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT product_variants_original_price_check CHECK (((original_price IS NULL) OR (original_price >= (0)::numeric))),
 CONSTRAINT product_variants_price_check CHECK ((price >= (0)::numeric)),
 CONSTRAINT product_variants_quantity_check CHECK ((quantity > (0)::numeric)),
 CONSTRAINT product_variants_unit_type_check CHECK ((unit_type = ANY (ARRAY['g'::text, 'kg'::text, 'ml'::text, 'l'::text, 'pc'::text])))
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
REVOKE INSERT,UPDATE,DELETE ON public.product_variants FROM anon,authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS local_name text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_veg boolean DEFAULT true NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS freshness_tag text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_status text DEFAULT 'in_stock'::text NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS bg_color text DEFAULT '#F6FAF0'::text NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sub_category_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved'::text NOT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pending_image_url text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS open_time text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS close_time text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS address_line text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS country text DEFAULT 'India'::text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS fssai_number text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS shop_establishment_number text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS pan_number text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS aadhaar_last4 text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS bank_account_last4 text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS turnover_exceeds_gst_threshold boolean DEFAULT false NOT NULL;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS drug_license_number text;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS manual_address text;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_onboarding_drafts' AND policyname='store_onboarding_drafts_legacy_baseline_read') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='store_onboarding_drafts' AND cmd IN('SELECT','ALL')) THEN CREATE POLICY store_onboarding_drafts_legacy_baseline_read ON public.store_onboarding_drafts FOR SELECT TO authenticated USING (user_id=auth.uid()); END IF; END $$;
GRANT SELECT ON public.store_onboarding_drafts TO authenticated;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_sections' AND policyname='category_sections_legacy_baseline_read') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_sections' AND cmd IN('SELECT','ALL')) THEN CREATE POLICY category_sections_legacy_baseline_read ON public.category_sections FOR SELECT TO authenticated,anon USING (true); END IF; END $$;
GRANT SELECT ON public.category_sections TO authenticated,anon;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='categories_legacy_baseline_read') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND cmd IN('SELECT','ALL')) THEN CREATE POLICY categories_legacy_baseline_read ON public.categories FOR SELECT TO authenticated,anon USING (is_active); END IF; END $$;
GRANT SELECT ON public.categories TO authenticated,anon;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sub_categories' AND policyname='sub_categories_legacy_baseline_read') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sub_categories' AND cmd IN('SELECT','ALL')) THEN CREATE POLICY sub_categories_legacy_baseline_read ON public.sub_categories FOR SELECT TO authenticated,anon USING (is_active); END IF; END $$;
GRANT SELECT ON public.sub_categories TO authenticated,anon;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_tabs' AND policyname='home_tabs_legacy_baseline_read') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_tabs' AND cmd IN('SELECT','ALL')) THEN CREATE POLICY home_tabs_legacy_baseline_read ON public.home_tabs FOR SELECT TO authenticated,anon USING (is_active); END IF; END $$;
GRANT SELECT ON public.home_tabs TO authenticated,anon;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_tab_tiles' AND policyname='home_tab_tiles_legacy_baseline_read') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_tab_tiles' AND cmd IN('SELECT','ALL')) THEN CREATE POLICY home_tab_tiles_legacy_baseline_read ON public.home_tab_tiles FOR SELECT TO authenticated,anon USING (is_active); END IF; END $$;
GRANT SELECT ON public.home_tab_tiles TO authenticated,anon;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_tab_banners' AND policyname='home_tab_banners_legacy_baseline_read') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='home_tab_banners' AND cmd IN('SELECT','ALL')) THEN CREATE POLICY home_tab_banners_legacy_baseline_read ON public.home_tab_banners FOR SELECT TO authenticated,anon USING (is_active); END IF; END $$;
GRANT SELECT ON public.home_tab_banners TO authenticated,anon;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='product_variants_legacy_baseline_read') AND NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND cmd IN('SELECT','ALL')) THEN CREATE POLICY product_variants_legacy_baseline_read ON public.product_variants FOR SELECT TO authenticated,anon USING (EXISTS(SELECT 1 FROM public.products p JOIN public.stores s ON s.id=p.store_id WHERE p.id=product_id AND p.approval_status='approved' AND s.is_active)); END IF; END $$;
GRANT SELECT ON public.product_variants TO authenticated,anon;
DO $migration$ BEGIN
 IF to_regprocedure('public.rls_auto_enable()') IS NULL THEN
  EXECUTE $ddl$ CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $body$
  DECLARE cmd record; BEGIN
   FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE schema_name='public'
    AND object_type IN('table','partitioned table') LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',cmd.object_identity);
   END LOOP;
  END $body$ $ddl$;
 END IF;
 IF to_regprocedure('public.sync_products_is_in_stock()') IS NULL THEN
  EXECUTE $ddl$ CREATE FUNCTION public.sync_products_is_in_stock() RETURNS trigger
  LANGUAGE plpgsql SET search_path=public,pg_temp AS $body$
  BEGIN NEW.is_in_stock:=(NEW.stock_status<>'out_of_stock'); RETURN NEW; END $body$ $ddl$;
  CREATE TRIGGER sync_is_in_stock BEFORE INSERT OR UPDATE ON public.products
   FOR EACH ROW EXECUTE FUNCTION public.sync_products_is_in_stock();
 END IF;
END $migration$;
REVOKE ALL ON FUNCTION public.rls_auto_enable(),public.sync_products_is_in_stock() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='product_variants_owner_write') THEN CREATE POLICY product_variants_owner_write ON public.product_variants FOR INSERT WITH CHECK(false); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='product_variants_owner_update') THEN CREATE POLICY product_variants_owner_update ON public.product_variants FOR UPDATE USING(false); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_variants' AND policyname='product_variants_owner_delete') THEN CREATE POLICY product_variants_owner_delete ON public.product_variants FOR DELETE USING(false); END IF; END $$;
COMMIT;

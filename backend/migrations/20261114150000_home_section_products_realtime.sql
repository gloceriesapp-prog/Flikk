-- Home product-pick changes must invalidate each API replica and customer cache.
-- No product, section visibility, stock or price is changed.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
         AND tablename = 'home_section_products'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.home_section_products;
  END IF;
END $$;
COMMIT;

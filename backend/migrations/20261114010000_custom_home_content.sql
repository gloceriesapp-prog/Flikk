-- Allow a separate managed layout for every founder-created Quick category.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
ALTER TABLE public.home_content DROP CONSTRAINT home_content_tab_key_check;
ALTER TABLE public.home_content ADD CONSTRAINT home_content_tab_key_check CHECK (
  tab_key IN ('grocery', 'fresh', 'regional', 'festivals', 'meat') OR
  tab_key ~ '^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);
COMMIT;

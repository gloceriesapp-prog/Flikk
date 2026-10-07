-- Admin-editable customer-facing content: legal links, support contacts,
-- About copy and free-form UI strings. Read publicly via the backend's
-- GET /app-config (service role); written only by the admin dashboard's
-- service-role API route. Clients never touch this table directly.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE TABLE IF NOT EXISTS public.app_content (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  terms_url text NULL CHECK (terms_url IS NULL OR (terms_url ~ '^https://[^\s]+$' AND length(terms_url) <= 2048)),
  privacy_url text NULL CHECK (privacy_url IS NULL OR (privacy_url ~ '^https://[^\s]+$' AND length(privacy_url) <= 2048)),
  refund_policy_url text NULL CHECK (refund_policy_url IS NULL OR (refund_policy_url ~ '^https://[^\s]+$' AND length(refund_policy_url) <= 2048)),
  support_phone text NULL CHECK (support_phone IS NULL OR support_phone ~ '^\+[1-9][0-9]{7,14}$'),
  support_email text NULL CHECK (support_email IS NULL OR (support_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(support_email) <= 254)),
  support_whatsapp text NULL CHECK (support_whatsapp IS NULL OR support_whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  about_title text NOT NULL DEFAULT 'About Gloceries' CHECK (length(btrim(about_title)) BETWEEN 1 AND 120),
  about_body text NOT NULL DEFAULT '' CHECK (length(about_body) <= 10000),
  copy jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(copy) = 'object' AND pg_column_size(copy) < 65536),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

INSERT INTO public.app_content (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

DO $hardening$
DECLARE
  attribute record;
  api_role text;
BEGIN
  ALTER TABLE public.app_content ENABLE ROW LEVEL SECURITY;
  -- No policies: anon/authenticated get nothing. TRUNCATE bypasses RLS and
  -- column grants survive a table-level REVOKE, so revoke both.
  REVOKE ALL ON TABLE public.app_content FROM PUBLIC, anon, authenticated;
  FOR attribute IN SELECT attname FROM pg_attribute
    WHERE attrelid = 'public.app_content'::regclass AND attnum > 0 AND NOT attisdropped LOOP
    EXECUTE format('REVOKE INSERT (%I), UPDATE (%I), REFERENCES (%I) ON TABLE public.app_content FROM PUBLIC, anon, authenticated',
      attribute.attname, attribute.attname, attribute.attname);
  END LOOP;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_content TO service_role;

  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_table_privilege(api_role, 'public.app_content', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_any_column_privilege(api_role, 'public.app_content', 'INSERT,UPDATE,REFERENCES') THEN
      RAISE EXCEPTION 'Unexpected write privilege for % on app_content', api_role;
    END IF;
  END LOOP;
END;
$hardening$;

COMMIT;

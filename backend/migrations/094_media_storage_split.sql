BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Metadata is server-owned. Public clients receive only the chosen display
-- URL from the existing product/store/content DTOs, never this upload ledger.
CREATE TABLE public.media_assets (
 id uuid PRIMARY KEY,
 provider text NOT NULL CHECK(provider IN('r2','supabase')),
 visibility text NOT NULL DEFAULT 'public' CHECK(visibility IN('public','private')),
 bucket text NOT NULL,
 object_key text NOT NULL CHECK(length(object_key) BETWEEN 1 AND 512 AND object_key !~ '(^/|\.\.|\\)'),
 public_url text,
 purpose text NOT NULL CHECK(purpose IN('appsui','banners','categories','festivals','illustrations','products','stores','rider-documents','store-documents','private-documents')),
 content_type text NOT NULL CHECK(content_type IN('image/webp','image/jpeg','application/pdf')),
 byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 5242880),
 sha256 text NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
 status text NOT NULL CHECK(status IN('pending','ready','failed')),
 cleanup_pending boolean NOT NULL DEFAULT false,
 cleanup_token uuid,
 cleanup_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,bucket,object_key),
 CHECK((provider='r2' AND visibility='public' AND public_url IS NOT NULL AND public_url LIKE 'https://%' AND purpose IN('appsui','banners','categories','festivals','illustrations','products','stores'))
  OR (provider='supabase' AND visibility='private' AND public_url IS NULL AND bucket=purpose AND purpose IN('rider-documents','store-documents','private-documents')))
);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_assets FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.media_assets TO service_role;
CREATE INDEX media_assets_recovery_idx ON public.media_assets(created_at,id) WHERE status='pending' OR cleanup_pending;
CREATE INDEX media_assets_owner_private_idx ON public.media_assets(uploaded_by,created_at DESC,id) WHERE visibility='private';

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('rider-documents','rider-documents',false,5242880,ARRAY['image/jpeg','image/png','image/webp']),
 ('store-documents','store-documents',false,5242880,ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
 ('private-documents','private-documents',false,5242880,ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
-- Restrictive policy dominates older permissive policies. Only trusted
-- service routes may upload, read or sign sensitive document objects.
CREATE POLICY private_documents_service_only ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
USING(bucket_id NOT IN('rider-documents','store-documents','private-documents'))
WITH CHECK(bucket_id NOT IN('rider-documents','store-documents','private-documents'));
-- Legacy public images remain readable during verified migration, but new
-- writes must use the server's R2 pipeline rather than direct Supabase REST.
CREATE POLICY public_media_no_direct_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
WITH CHECK(bucket_id NOT IN('product-images','store-images','category-images','home-tab-images','home-tab-banner-images','Images'));
CREATE POLICY public_media_no_direct_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
USING(bucket_id NOT IN('product-images','store-images','category-images','home-tab-images','home-tab-banner-images','Images'))
WITH CHECK(bucket_id NOT IN('product-images','store-images','category-images','home-tab-images','home-tab-banner-images','Images'));
-- Recovery is leased across worker replicas. A one-hour grace period exceeds
-- admitted upload timeouts; ready assets are never selected for deletion.
CREATE FUNCTION public.claim_media_cleanup(p_limit integer DEFAULT 25)
RETURNS SETOF public.media_assets LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH candidates AS (
  SELECT id FROM media_assets WHERE (status='pending' OR cleanup_pending)
   AND created_at < now()-interval '1 hour'
   AND (cleanup_until IS NULL OR cleanup_until < now())
  ORDER BY created_at,id LIMIT least(greatest(p_limit,1),100) FOR UPDATE SKIP LOCKED
 ) UPDATE media_assets a SET status='failed',cleanup_pending=true,
  cleanup_token=gen_random_uuid(),cleanup_until=now()+interval '5 minutes',updated_at=now()
 FROM candidates c WHERE a.id=c.id RETURNING a.*;
$$;
CREATE FUNCTION public.complete_media_cleanup(p_id uuid,p_token uuid,p_success boolean)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH done AS (UPDATE media_assets SET cleanup_pending=NOT p_success,cleanup_token=NULL,
  cleanup_until=CASE WHEN p_success THEN NULL ELSE now()+interval '15 minutes' END,updated_at=now()
  WHERE id=p_id AND cleanup_token=p_token AND status='failed' RETURNING id)
 SELECT EXISTS(SELECT 1 FROM done);
$$;
REVOKE ALL ON FUNCTION public.claim_media_cleanup(integer),public.complete_media_cleanup(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_media_cleanup(integer),public.complete_media_cleanup(uuid,uuid,boolean) TO service_role;
COMMIT;

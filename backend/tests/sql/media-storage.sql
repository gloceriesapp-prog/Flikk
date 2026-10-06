\set ON_ERROR_STOP on
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated fixture'; END IF; END $$;
BEGIN;
-- Simulate an old permissive storage policy: restrictive privacy still wins.
CREATE POLICY media_fixture_allow ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
INSERT INTO storage.buckets(id,name,public) VALUES('Images','Images',true) ON CONFLICT DO NOTHING;
INSERT INTO storage.objects(bucket_id,name) VALUES('rider-documents','fixture.jpg'),('Images','fixture.jpg');
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.buckets WHERE id IN('rider-documents','store-documents','private-documents') AND public) THEN RAISE EXCEPTION 'Sensitive bucket public'; END IF;
 IF has_table_privilege('anon','media_assets','SELECT') OR has_table_privilege('authenticated','media_assets','INSERT') THEN RAISE EXCEPTION 'Ledger exposed'; END IF;
 IF has_function_privilege('anon','claim_media_cleanup(integer)','EXECUTE') OR has_function_privilege('authenticated','complete_media_cleanup(uuid,uuid,boolean)','EXECUTE') THEN RAISE EXCEPTION 'Cleanup RPC exposed'; END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='rider-documents') THEN RAISE EXCEPTION 'Private document visible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='Images') THEN RAISE EXCEPTION 'Legacy public image disappeared'; END IF;
 BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('Images','blocked.jpg'); RAISE EXCEPTION 'Direct public upload permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO storage.objects(bucket_id,name) VALUES('rider-documents','blocked.jpg'); RAISE EXCEPTION 'Direct private upload permitted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
INSERT INTO media_assets(id,provider,bucket,object_key,public_url,purpose,content_type,byte_size,sha256,status,created_at)
VALUES('00000000-0000-4000-8000-000000000094','r2','gloceries-public','products/fixture.webp','https://images.example.com/products/fixture.webp','products','image/webp',16,repeat('a',64),'pending',now()-interval '2 hours'),
('00000000-0000-4000-8000-000000000095','r2','gloceries-public','products/ready.webp','https://images.example.com/products/ready.webp','products','image/webp',16,repeat('b',64),'ready',now()-interval '2 hours');
DO $$ DECLARE token uuid; BEGIN
 SELECT cleanup_token INTO token FROM claim_media_cleanup(25) WHERE id='00000000-0000-4000-8000-000000000094';
 IF token IS NULL THEN RAISE EXCEPTION 'Interrupted upload not claimed'; END IF;
 IF EXISTS(SELECT 1 FROM claim_media_cleanup(25) WHERE id IN('00000000-0000-4000-8000-000000000094','00000000-0000-4000-8000-000000000095')) THEN RAISE EXCEPTION 'Leased or ready object claimed'; END IF;
 IF complete_media_cleanup('00000000-0000-4000-8000-000000000094',gen_random_uuid(),true) THEN RAISE EXCEPTION 'Lease fencing failed'; END IF;
 IF NOT complete_media_cleanup('00000000-0000-4000-8000-000000000094',token,true) THEN RAISE EXCEPTION 'Completion failed'; END IF;
END $$;
ROLLBACK;
SELECT 'Media privacy, legacy compatibility and cleanup leases verified' AS result;

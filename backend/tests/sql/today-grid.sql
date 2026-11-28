\set ON_ERROR_STOP on
-- Today grid storage (migration 20261128130000). Disposable fixture; rolls back.
DO $$ BEGIN IF current_database()<>'flikk_migrations_tests' THEN RAISE EXCEPTION 'Use isolated flikk_migrations_tests'; END IF; END $$;
BEGIN;
INSERT INTO today_grid_versions(config,created_by) VALUES('{"a":1}','ops@example.com'),('{"a":2}','ops@example.com');
DO $$ DECLARE first bigint; BEGIN
 SELECT min(id) INTO first FROM today_grid_versions;
 PERFORM publish_today_grid(first,'Ops@Example.com');
 IF (SELECT published_version_id FROM today_grid_state WHERE id=1)<>first THEN RAISE EXCEPTION 'Publish did not point the live grid at the version'; END IF;
 IF (SELECT published_by FROM today_grid_versions WHERE id=first)<>'ops@example.com' THEN RAISE EXCEPTION 'Publisher not recorded'; END IF;
 BEGIN PERFORM publish_today_grid(999999,'ops@example.com'); RAISE EXCEPTION 'Published a missing version';
 EXCEPTION WHEN SQLSTATE 'P0404' THEN NULL; END;
 BEGIN INSERT INTO today_grid_versions(config,created_by) VALUES('[]','ops@example.com'); RAISE EXCEPTION 'Non-object config stored';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF has_table_privilege('authenticated','public.today_grid_versions','SELECT') OR has_table_privilege('anon','public.village_picks','SELECT')
  OR has_function_privilege('authenticated','public.publish_today_grid(bigint,text)','EXECUTE') THEN RAISE EXCEPTION 'Must be service role only'; END IF;
 IF (SELECT is_local FROM brands LIMIT 1) IS DISTINCT FROM false AND EXISTS(SELECT 1 FROM brands) THEN RAISE EXCEPTION 'Brands default to not local'; END IF;
END $$;
ROLLBACK;

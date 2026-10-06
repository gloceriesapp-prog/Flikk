BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
-- Older installations created these address-book fields outside migrations.
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS recipient_name text,ADD COLUMN IF NOT EXISTS recipient_phone text,ADD COLUMN IF NOT EXISTS delivery_instructions text;
-- Shared limits across replicas. Store only keyed hashes, never phone/IP values.
CREATE TABLE public.auth_abuse_windows(bucket text NOT NULL,window_at timestamptz NOT NULL,hits integer NOT NULL CHECK(hits>0),PRIMARY KEY(bucket,window_at));
ALTER TABLE auth_abuse_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON auth_abuse_windows FROM PUBLIC,anon,authenticated;
GRANT ALL ON auth_abuse_windows TO service_role;
CREATE INDEX auth_abuse_windows_expiry ON auth_abuse_windows(window_at);
CREATE FUNCTION public.claim_auth_budget(p_buckets jsonb) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b jsonb; used integer; current_window timestamptz:=date_trunc('minute',clock_timestamp()); denied boolean:=false;
BEGIN
 IF jsonb_typeof(p_buckets)<>'array' OR jsonb_array_length(p_buckets) NOT BETWEEN 1 AND 4 THEN RAISE EXCEPTION 'Invalid auth budget'; END IF;
 -- Deterministic ordering prevents cross-bucket deadlocks.
 FOR b IN SELECT value FROM jsonb_array_elements(p_buckets) ORDER BY value->>'key' LOOP
  IF length(b->>'key')<>64 OR (b->>'limit')::integer NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Invalid auth bucket'; END IF;
  INSERT INTO auth_abuse_windows(bucket,window_at,hits) VALUES(b->>'key',current_window,1)
  ON CONFLICT(bucket,window_at) DO UPDATE SET hits=auth_abuse_windows.hits+1 RETURNING hits INTO used;
  denied:=denied OR used>(b->>'limit')::integer;
 END LOOP;
 RETURN CASE WHEN denied THEN greatest(1,ceil(extract(epoch FROM current_window+interval '1 minute'-clock_timestamp()))::integer) ELSE 0 END;
END $$;
CREATE FUNCTION public.prune_auth_budgets() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE removed integer;
BEGIN
 WITH due AS(SELECT bucket,window_at FROM auth_abuse_windows WHERE window_at<now()-interval '1 day' ORDER BY window_at LIMIT 1000 FOR UPDATE SKIP LOCKED)
 DELETE FROM auth_abuse_windows w USING due d WHERE w.bucket=d.bucket AND w.window_at=d.window_at;
 GET DIAGNOSTICS removed=ROW_COUNT; RETURN removed;
END $$;
-- Repair legacy duplicate defaults before installing the invariant.
WITH defaults AS(SELECT id,row_number() OVER(PARTITION BY user_id ORDER BY id) position FROM addresses WHERE is_default AND deleted_at IS NULL)
UPDATE addresses SET is_default=false FROM defaults d WHERE addresses.id=d.id AND d.position>1;
UPDATE addresses SET is_default=false WHERE deleted_at IS NOT NULL AND is_default;
CREATE UNIQUE INDEX addresses_one_active_default ON addresses(user_id) WHERE is_default AND deleted_at IS NULL;
CREATE FUNCTION public.manage_customer_address(p_customer uuid,p_action text,p_id uuid DEFAULT null,p_data jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result addresses; replacement uuid;
BEGIN
 -- Lock a stable owner row before reading defaults: concurrent creates,
 -- switches and deletes serialize for this account, not the whole table.
 PERFORM 1 FROM users WHERE id=p_customer AND role='customer' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer required'; END IF;
 IF p_action='create' THEN
  IF coalesce(btrim(p_data->>'line1'),'')='' OR coalesce(btrim(p_data->>'recipient_name'),'')='' THEN RAISE EXCEPTION 'Address and receiver required'; END IF;
  IF (p_data->>'latitude') IS NULL OR (p_data->>'longitude') IS NULL
   OR (p_data->>'latitude')::numeric NOT BETWEEN -90 AND 90 OR (p_data->>'longitude')::numeric NOT BETWEEN -180 AND 180 THEN RAISE EXCEPTION 'Invalid location'; END IF;
  INSERT INTO addresses(user_id,zone_id,label,line1,landmark,recipient_name,recipient_phone,delivery_instructions,latitude,longitude,is_default)
  VALUES(p_customer,(p_data->>'zone_id')::uuid,coalesce(nullif(btrim(p_data->>'label'),''),'Home'),btrim(p_data->>'line1'),nullif(btrim(p_data->>'landmark'),''),
   btrim(p_data->>'recipient_name'),nullif(btrim(p_data->>'recipient_phone'),''),nullif(btrim(p_data->>'delivery_instructions'),''),
   (p_data->>'latitude')::numeric,(p_data->>'longitude')::numeric,NOT EXISTS(SELECT 1 FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL)) RETURNING * INTO result;
 ELSIF p_action IN('default','delete') THEN
  SELECT * INTO result FROM addresses WHERE id=p_id AND user_id=p_customer AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN null; END IF;
  IF p_action='default' THEN
   UPDATE addresses SET is_default=false WHERE user_id=p_customer AND is_default AND deleted_at IS NULL;
   UPDATE addresses SET is_default=true WHERE id=p_id RETURNING * INTO result;
  ELSE
   UPDATE addresses SET deleted_at=now(),is_default=false WHERE id=p_id RETURNING * INTO result;
   IF NOT EXISTS(SELECT 1 FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL AND is_default) THEN
    SELECT id INTO replacement FROM addresses WHERE user_id=p_customer AND deleted_at IS NULL ORDER BY id LIMIT 1;
    UPDATE addresses SET is_default=true WHERE id=replacement;
   END IF;
  END IF;
 ELSE RAISE EXCEPTION 'Invalid address action'; END IF;
 RETURN to_jsonb(result);
END $$;
-- Default invariants must not be bypassed by direct client writes.
REVOKE INSERT,UPDATE,DELETE ON addresses FROM PUBLIC,anon,authenticated;
DO $$ DECLARE field record; BEGIN
 FOR field IN SELECT attname FROM pg_attribute WHERE attrelid='public.addresses'::regclass AND attnum>0 AND NOT attisdropped LOOP
  EXECUTE format('REVOKE INSERT(%I),UPDATE(%I) ON addresses FROM PUBLIC,anon,authenticated',field.attname,field.attname);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION claim_auth_budget(jsonb),prune_auth_budgets(),manage_customer_address(uuid,text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION claim_auth_budget(jsonb),prune_auth_budgets(),manage_customer_address(uuid,text,uuid,jsonb) TO service_role;
COMMIT;

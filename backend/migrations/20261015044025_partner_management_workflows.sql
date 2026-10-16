-- Legal-number replacements reuse the atomic admin-reviewed store-change workflow.
BEGIN;
CREATE OR REPLACE FUNCTION public.partner_request_store_profile_change(p_store uuid, p_user uuid, p_changes jsonb)
 RETURNS public.store_profile_change_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  s public.stores;
  live jsonb;
  old public.store_profile_change_requests;
  merged jsonb;
  prev jsonb := '{}'::jsonb;
  k text;
  r public.store_profile_change_requests;
BEGIN
  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION USING errcode='P0400', message='changes must be an object';
  END IF;
  FOR k IN SELECT jsonb_object_keys(p_changes) LOOP
    IF k <> ALL(ARRAY['name','category','district','address_line','manual_address','lat','lng','drug_license_number','pan_number','fssai_number','gst_number','shop_establishment_number']) THEN
      RAISE EXCEPTION USING errcode='P0400', message=format('%s is not a reviewed store field', k);
    END IF;
  END LOOP;

  IF (p_changes ? 'pan_number' AND coalesce(p_changes->>'pan_number','') !~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
     OR (p_changes ? 'fssai_number' AND coalesce(p_changes->>'fssai_number','') !~ '^[0-9]{14}$')
     OR (p_changes ? 'gst_number' AND coalesce(p_changes->>'gst_number','') !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$')
     OR (p_changes ? 'shop_establishment_number' AND length(btrim(coalesce(p_changes->>'shop_establishment_number',''))) NOT BETWEEN 1 AND 100) THEN
    RAISE EXCEPTION USING errcode='P0400', message='Invalid replacement document number';
  END IF;
  SELECT * INTO s FROM stores WHERE id=p_store FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Store not found'; END IF;
  IF p_user IS NULL OR s.owner_user_id <> p_user THEN
    RAISE EXCEPTION USING errcode='P0403', message='Not this store''s owner';
  END IF;
  live := jsonb_build_object('name', s.name, 'category', s.category, 'district', s.district,
    'address_line', s.address_line, 'manual_address', s.manual_address, 'lat', s.lat, 'lng', s.lng,
    'drug_license_number', s.drug_license_number,'pan_number',s.pan_number,'fssai_number',s.fssai_number,'gst_number',s.gst_number,'shop_establishment_number',s.shop_establishment_number);
  SELECT * INTO old FROM store_profile_change_requests WHERE store_id=p_store AND status='pending' FOR UPDATE;
  merged := coalesce(old.changes, '{}'::jsonb) || p_changes;
  -- A field set back to its live value is no longer a change (blank text
  -- and NULL count as the same value).
  FOR k IN SELECT jsonb_object_keys(merged) LOOP
    IF (k IN ('lat', 'lng') AND merged->k IS NOT DISTINCT FROM live->k)
       OR (k NOT IN ('lat', 'lng') AND coalesce(merged->>k, '') = coalesce(live->>k, '')) THEN
      merged := merged - k;
    ELSE
      prev := prev || jsonb_build_object(k, live->k);
    END IF;
  END LOOP;
  IF old.id IS NOT NULL THEN
    UPDATE store_profile_change_requests SET status='superseded' WHERE id=old.id;
  END IF;
  IF merged = '{}'::jsonb THEN RETURN NULL; END IF;
  INSERT INTO store_profile_change_requests(store_id, requested_by, changes, previous)
  VALUES (p_store, p_user, merged, prev) RETURNING * INTO r;
  RETURN r;
END $function$;
REVOKE ALL ON FUNCTION public.partner_request_store_profile_change(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_request_store_profile_change(uuid, uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_review_store_profile_change(p_request uuid, p_approve boolean, p_reason text, p_admin uuid)
 RETURNS public.store_profile_change_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  r public.store_profile_change_requests;
  c jsonb;
  s public.stores;
  v_reason text := left(nullif(btrim(coalesce(p_reason, '')), ''), 500);
BEGIN
  IF p_approve IS NULL THEN RAISE EXCEPTION USING errcode='P0400', message='approve must be true or false'; END IF;
  SELECT * INTO r FROM store_profile_change_requests WHERE id=p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Change request not found'; END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION USING errcode='P0409', message='This change request was already handled or replaced by a newer one';
  END IF;
  IF NOT p_approve THEN
    IF length(coalesce(v_reason, '')) < 3 THEN
      RAISE EXCEPTION USING errcode='P0400', message='A rejection reason is required';
    END IF;
    UPDATE store_profile_change_requests SET status='rejected', review_reason=v_reason, reviewed_by=p_admin, reviewed_at=now()
    WHERE id=p_request RETURNING * INTO r;
    RETURN r;
  END IF;
  c := r.changes;

  IF (c ? 'pan_number' AND coalesce(c->>'pan_number','') !~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
     OR (c ? 'fssai_number' AND coalesce(c->>'fssai_number','') !~ '^[0-9]{14}$')
     OR (c ? 'gst_number' AND coalesce(c->>'gst_number','') !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$')
     OR (c ? 'shop_establishment_number' AND length(btrim(coalesce(c->>'shop_establishment_number',''))) NOT BETWEEN 1 AND 100) THEN
    RAISE EXCEPTION USING errcode='P0400', message='Invalid replacement document number';
  END IF;

  UPDATE stores SET
    name = CASE WHEN c ? 'name' THEN c->>'name' ELSE name END,
    category = CASE WHEN c ? 'category' THEN c->>'category' ELSE category END,
    district = CASE WHEN c ? 'district' THEN c->>'district' ELSE district END,
    address_line = CASE WHEN c ? 'address_line' THEN c->>'address_line' ELSE address_line END,
    manual_address = CASE WHEN c ? 'manual_address' THEN c->>'manual_address' ELSE manual_address END,
    lat = CASE WHEN c ? 'lat' THEN (c->>'lat')::double precision ELSE lat END,
    lng = CASE WHEN c ? 'lng' THEN (c->>'lng')::double precision ELSE lng END,
    drug_license_number = CASE WHEN c ? 'drug_license_number' THEN c->>'drug_license_number' ELSE drug_license_number END,pan_number = CASE WHEN c ? 'pan_number' THEN c->>'pan_number' ELSE pan_number END,fssai_number = CASE WHEN c ? 'fssai_number' THEN c->>'fssai_number' ELSE fssai_number END,gst_number = CASE WHEN c ? 'gst_number' THEN c->>'gst_number' ELSE gst_number END,shop_establishment_number = CASE WHEN c ? 'shop_establishment_number' THEN c->>'shop_establishment_number' ELSE shop_establishment_number END
  WHERE id=r.store_id RETURNING * INTO s;
  IF NOT FOUND THEN RAISE EXCEPTION USING errcode='P0404', message='Store not found'; END IF;
  IF s.category = 'Pharmacy' AND nullif(btrim(coalesce(s.drug_license_number, '')), '') IS NULL THEN
    RAISE EXCEPTION USING errcode='P0400', message='A pharmacy needs a drug licence number';
  END IF;
  UPDATE store_profile_change_requests SET status='approved', review_reason=v_reason, reviewed_by=p_admin, reviewed_at=now()
  WHERE id=p_request RETURNING * INTO r;
  RETURN r;
END $function$;
REVOKE ALL ON FUNCTION public.admin_review_store_profile_change(uuid, boolean, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_store_profile_change(uuid, boolean, text, uuid) TO service_role;


CREATE OR REPLACE FUNCTION public.partner_remove_store_member(p_store uuid,p_owner uuid,p_member uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.stores WHERE id=p_store AND owner_user_id=p_owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0403',MESSAGE='OWNER_REQUIRED'; END IF;
 IF p_member=p_owner THEN RAISE EXCEPTION USING ERRCODE='P0400',MESSAGE='PRIMARY_OWNER_IMMUTABLE'; END IF;
 UPDATE public.store_memberships SET is_active=false,updated_at=now() WHERE store_id=p_store AND user_id=p_member AND is_active;
END; $$;
REVOKE ALL ON FUNCTION public.partner_remove_store_member(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.partner_remove_store_member(uuid,uuid,uuid) TO service_role;

COMMIT;

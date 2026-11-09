BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE FUNCTION public.save_partner_catalogue_submission(
  p_store uuid, p_fields jsonb, p_variants jsonb, p_sub_category uuid,
  p_catalogue_item uuid, p_photos uuid[]
) RETURNS uuid
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
  product_id uuid;
  category_name text;
  photos text[];
BEGIN
  IF p_store IS NULL OR coalesce(cardinality(p_photos), 0) NOT BETWEEN 1 AND 5
     OR cardinality(p_photos) <> (SELECT count(DISTINCT id) FROM unnest(p_photos) AS photo(id)) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0400', MESSAGE = 'Take between one and five distinct product photos.';
  END IF;

  SELECT c.name INTO category_name
  FROM public.sub_categories s
  JOIN public.categories c ON c.id = s.category_id
  WHERE s.id = p_sub_category AND s.is_active AND c.is_active
  FOR SHARE OF s, c;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0400', MESSAGE = 'Select an available category and subcategory.';
  END IF;

  IF p_catalogue_item IS NOT NULL THEN
    PERFORM 1 FROM public.catalogue_items
    WHERE id = p_catalogue_item AND sub_category_id = p_sub_category
      AND name = p_fields->>'name'
    FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0400', MESSAGE = 'Select the catalogue suggestion again or enter the name manually.';
    END IF;
  END IF;

  SELECT array_agg(asset.public_url ORDER BY photo.position) INTO photos
  FROM unnest(p_photos) WITH ORDINALITY AS photo(id, position)
  JOIN public.media_assets asset ON asset.id = photo.id
  WHERE asset.provider = 'r2' AND asset.visibility = 'public' AND asset.purpose = 'products' AND asset.status = 'ready'
    AND asset.object_key = 'products/' || p_store::text || '/' || asset.id::text || '.webp'
    AND asset.public_url LIKE 'https://%';

  IF cardinality(photos) IS DISTINCT FROM cardinality(p_photos) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0400', MESSAGE = 'Upload all photos from this store before submitting.';
  END IF;

  -- Protect against duplicate taps, retries and simultaneous submissions from this store.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_store::text || ':' || lower(p_fields->>'name'), 0));
  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE store_id = p_store AND lower(btrim(name)) = lower(p_fields->>'name')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0409', MESSAGE = 'A product with this name is already listed in your store.';
  END IF;

  product_id := public.save_catalogue_product(NULL, p_store, p_fields || jsonb_build_object(
    'category', category_name, 'sub_category_id', p_sub_category, 'image_url', photos[1]
  ), p_variants);

  UPDATE public.products SET catalogue_item_id = p_catalogue_item, extra_image_urls = photos[2:5]
  WHERE id = product_id AND store_id = p_store;
  RETURN product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_partner_catalogue_submission(uuid,jsonb,jsonb,uuid,uuid,uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_partner_catalogue_submission(uuid,jsonb,jsonb,uuid,uuid,uuid[]) TO service_role;
COMMIT;

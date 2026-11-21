-- 20261121120000's replace_product_extra_image compared p_to against a
-- scalar subquery with "= ANY ((SELECT array))", which Postgres reads as a
-- set comparison of text with text[] (42883), so no cleaned extra photo was
-- ever swapped in. Read the array once (row locked) and compare against it.
CREATE OR REPLACE FUNCTION public.replace_product_extra_image(p_product uuid, p_from text[], p_to text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE urls text[]; current_url text;
BEGIN
  SELECT extra_image_urls INTO urls FROM products WHERE id = p_product FOR UPDATE;
  IF urls IS NULL OR p_to = ANY (urls) THEN RETURN false; END IF;
  SELECT u INTO current_url FROM unnest(urls) AS u WHERE u = ANY (p_from) LIMIT 1;
  IF current_url IS NULL THEN RETURN false; END IF;
  UPDATE products SET extra_image_urls = array_replace(urls, current_url, p_to) WHERE id = p_product;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.replace_product_extra_image(uuid, text[], text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_product_extra_image(uuid, text[], text) TO service_role;

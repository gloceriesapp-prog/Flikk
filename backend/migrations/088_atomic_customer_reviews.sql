-- Customer reviews are server-owned. Aggregate deltas share the review transaction.
BEGIN;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS review_count bigint NOT NULL DEFAULT 0;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS review_rating_sum bigint NOT NULL DEFAULT 0;
LOCK TABLE public.reviews IN SHARE ROW EXCLUSIVE MODE;
UPDATE public.stores s SET review_count=a.n,review_rating_sum=a.total,rating=a.average
FROM (SELECT s.id,count(r.id) n,coalesce(sum(r.rating),0) total,
 coalesce(round(avg(r.rating)::numeric,1),0) average
 FROM public.stores s LEFT JOIN public.reviews r ON r.store_id=s.id GROUP BY s.id) a WHERE s.id=a.id;
REVOKE INSERT,UPDATE,DELETE ON public.reviews FROM anon,authenticated;
DROP POLICY IF EXISTS reviews_customer_insert ON public.reviews;
CREATE OR REPLACE FUNCTION public.validate_customer_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE o orders;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF (to_jsonb(NEW)-'owner_reply'-'owner_replied_at') IS DISTINCT FROM (to_jsonb(OLD)-'owner_reply'-'owner_replied_at') THEN
   RAISE EXCEPTION 'Review content is immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO o FROM orders WHERE id=NEW.order_id FOR SHARE;
 IF NOT FOUND OR o.customer_id<>NEW.customer_id OR o.store_id<>NEW.store_id THEN
  RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
 IF o.status<>'delivered' OR length(coalesce(NEW.comment,''))>2000 THEN
  RAISE EXCEPTION 'Review not eligible' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_customer_review BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.validate_customer_review();
CREATE OR REPLACE FUNCTION public.maintain_store_review_totals() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE target uuid; delta int; amount int;
BEGIN
 target:=CASE WHEN TG_OP='INSERT' THEN NEW.store_id ELSE OLD.store_id END;
 delta:=CASE WHEN TG_OP='INSERT' THEN 1 ELSE -1 END;
 amount:=CASE WHEN TG_OP='INSERT' THEN NEW.rating ELSE -OLD.rating END;
 UPDATE stores SET review_count=review_count+delta,review_rating_sum=review_rating_sum+amount,
 rating=CASE WHEN review_count+delta=0 THEN 0 ELSE
 round((review_rating_sum+amount)::numeric/(review_count+delta),1) END WHERE id=target;
 RETURN NULL;
END $$;
CREATE TRIGGER maintain_store_review_totals AFTER INSERT OR DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.maintain_store_review_totals();
CREATE OR REPLACE FUNCTION public.submit_customer_review(p_order uuid,p_customer uuid,p_rating int,p_comment text DEFAULT NULL)
RETURNS public.reviews LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE result reviews; target uuid;
BEGIN
 SELECT store_id INTO target FROM orders WHERE id=p_order AND customer_id=p_customer;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found' USING ERRCODE='P0002'; END IF;
 INSERT INTO reviews(order_id,customer_id,store_id,rating,comment)
 VALUES(p_order,p_customer,target,p_rating,p_comment) RETURNING * INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION validate_customer_review(),maintain_store_review_totals(),submit_customer_review(uuid,uuid,int,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION submit_customer_review(uuid,uuid,int,text) TO service_role;
COMMIT;

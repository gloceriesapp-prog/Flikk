-- Rank in SQL: transfer at most ten candidate IDs, never past line-item history.
CREATE OR REPLACE FUNCTION public.repeat_purchase_candidates(p_customer uuid,p_stores uuid[],p_limit int DEFAULT 10)
RETURNS TABLE(product_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 WITH recent AS MATERIALIZED (
  SELECT id,placed_at FROM orders WHERE customer_id=p_customer AND status='delivered'
  ORDER BY placed_at DESC,id DESC LIMIT 100
 ) SELECT i.product_id FROM recent o JOIN order_items i ON i.order_id=o.id
 JOIN products p ON p.id=i.product_id JOIN stores s ON s.id=p.store_id
 WHERE p.store_id=ANY(p_stores) AND p.is_in_stock AND p.approval_status='approved' AND s.is_active
 AND cardinality(p_stores)<=100
 GROUP BY i.product_id ORDER BY count(*) DESC,max(o.placed_at) DESC,i.product_id
 LIMIT least(greatest(p_limit,1),10);
$$;
CREATE INDEX IF NOT EXISTS orders_delivered_repeat_cursor_idx ON orders(customer_id,placed_at DESC,id DESC) WHERE status='delivered';
CREATE INDEX IF NOT EXISTS order_items_repeat_candidates_idx ON order_items(order_id,product_id);
REVOKE ALL ON FUNCTION repeat_purchase_candidates(uuid,uuid[],int) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION repeat_purchase_candidates(uuid,uuid[],int) TO service_role;

interface ReceiptItem {
  product_name_at_order?: string | null;
  product_image_at_order?: string | null;
  unit_at_order?: string | null;
  products?: { name?: string; image_url?: string | null; unit?: string } | { name?: string; image_url?: string | null; unit?: string }[] | null;
}
// Legacy orders have no trustworthy name/image snapshot; retain their existing
// fallback instead of pretending today's values were known at checkout.
export function receiptItems<T extends ReceiptItem>(items: T[]): T[] {
  return items.map(item => item.product_name_at_order ? { ...item, products: {
    ...(Array.isArray(item.products) ? item.products[0] : item.products), name: item.product_name_at_order,
    image_url: item.product_image_at_order ?? null,
    unit: item.unit_at_order ?? (Array.isArray(item.products) ? item.products[0]?.unit : item.products?.unit),
  } } : item);
}

// Delivery/receipt DTOs must not follow later address-book edits. New orders
// have a database-owned immutable snapshot; older orders retain their join.
export function withReceiptAddress<T extends { addresses?: unknown; delivery_address_at_order?: unknown }>(row: T): T {
  const snapshot = row.delivery_address_at_order;
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)
    || typeof (snapshot as Record<string, unknown>).line1 !== 'string') return row;
  return { ...row, addresses: snapshot };
}

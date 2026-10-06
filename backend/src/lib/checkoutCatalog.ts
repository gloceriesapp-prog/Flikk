import { supabase } from '../db/supabase.js';
import { AppError } from './errors.js';
import type { CartItem } from './orderValidation.js';
import { parseCheckoutItems, priceCheckoutItems, type CheckoutProduct } from './checkoutItems.js';

let schemaCheck: Promise<void> | null = null;
function requirePackSnapshots(): Promise<void> {
  // Cache a successful check per process, share concurrent attempts, and
  // retry failures so applying the migration needs no backend restart.
  if (!schemaCheck) {
    schemaCheck = (async () => {
      const { error } = await supabase.from('order_items')
        .select('variant_id, unit_at_order, variant_mrp_at_order').limit(0);
      if (error) throw new AppError(503, 'CHECKOUT_NOT_READY', 'Checkout is temporarily unavailable. Please try again shortly.');
      const { data: version, error: eligibilityError } = await supabase.rpc('checkout_eligibility_version');
      if (eligibilityError || version !== 1) throw new AppError(503, 'CHECKOUT_NOT_READY', 'Checkout is temporarily unavailable. Please try again shortly.');
    })().catch((error: unknown) => {
      schemaCheck = null;
      throw error;
    });
  }
  return schemaCheck;
}

// Cart availability works before order activation and returns every status.
export async function readCheckoutCatalog(items: CartItem[]) {
  const { data, error } = await supabase.from('products')
    .select('id, store_id, price, original_price, unit, is_in_stock, approval_status, stock_status, stock_quantity, stock_tracking_enabled, product_variants(id, unit_type, quantity, price, original_price, is_default, stock_quantity)')
    .in('id', [...new Set(items.map((item) => item.product_id))]);
  if (error) throw error;
  return (data ?? []) as CheckoutProduct[];
}
export async function loadCheckoutItems(input: unknown, storeId?: string, catalog?: CheckoutProduct[]) {
  const items = parseCheckoutItems(input);
  await requirePackSnapshots();
  const priced = priceCheckoutItems(items, catalog ?? await readCheckoutCatalog(items));
  if (storeId && priced.some((item) => item.store_id !== storeId)) {
    throw new AppError(400, 'MULTI_STORE_CART', 'All items must belong to the selected store.');
  }
  return priced;
}

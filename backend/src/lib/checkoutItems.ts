import { AppError } from './errors.js';
import type { CartItem, CartProduct } from './orderValidation.js';

export interface CheckoutVariant {
  id: string;
  unit_type: string;
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
  stock_quantity?: number | null;
}
export interface CheckoutProduct extends CartProduct {
  unit?: string | null;
  original_price?: number | null;
  product_variants: CheckoutVariant[];
}
export interface PricedCheckoutItem extends CartItem {
  store_id: string;
  variant_id: string | null;
  unit_price_at_order: number;
  unit_at_order: string;
  variant_mrp_at_order: number;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function checkoutTransactionError(code: string): AppError {
  if (code === 'P1001') return new AppError(409, 'CHECKOUT_INELIGIBLE', 'Shop hours or delivery eligibility changed. Review your cart.');
  if (code === 'P1003') return new AppError(409, 'PROMO_CHANGED', 'This promotion changed or expired. Refresh checkout.');
  if (code === 'P1002') return new AppError(409, 'STOCK_UNAVAILABLE', 'Stock changed. Reduce or remove unavailable items before ordering.');
  const changed = ['40001', 'P0001', '40P01'].includes(code);
  return new AppError(changed ? 409 : 500, changed ? 'CHECKOUT_CHANGED' : 'CHECKOUT_FAILED',
    changed ? 'A pack changed or became unavailable. Refresh your cart and try again.'
      : 'Could not create your order. Please try again.');
}

export function parseCheckoutItems(input: unknown): CartItem[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 100) {
    throw new AppError(400, 'INVALID_CART', 'Choose between 1 and 100 product packs.');
  }
  return input.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new AppError(400, 'INVALID_CART', 'Invalid product pack.');
    const row = item as Record<string, unknown>;
    if (typeof row.product_id !== 'string' || !UUID.test(row.product_id)
      || (row.variant_id != null && (typeof row.variant_id !== 'string' || !UUID.test(row.variant_id)))
      || !Number.isInteger(row.quantity) || Number(row.quantity) < 1 || Number(row.quantity) > 999
      || (row.expected_unit_price != null && (typeof row.expected_unit_price !== 'number' || !Number.isFinite(row.expected_unit_price) || row.expected_unit_price < 0))) {
      throw new AppError(400, 'INVALID_CART', 'Choose a real product pack and a whole quantity between 1 and 999.');
    }
    // Ignore all client prices/pack labels. UUID normalization prevents aliases.
    return { product_id: row.product_id.toLowerCase(), variant_id: (row.variant_id as string | null | undefined)?.toLowerCase() ?? null,
      quantity: Number(row.quantity), expected_unit_price: row.expected_unit_price as number | undefined };
  });
}

export function priceCheckoutItems(items: CartItem[], products: CheckoutProduct[]): PricedCheckoutItem[] {
  const catalogue = new Map(products.map((product) => [product.id, product]));
  const lines = new Map<string, PricedCheckoutItem>();
  for (const item of items) {
    const product = catalogue.get(item.product_id);
    if (!product) throw new AppError(400, 'PRODUCT_NOT_FOUND', 'A product is no longer available. Remove it and try again.');
    if (!product.is_in_stock) throw new AppError(409, 'STOCK_UNAVAILABLE', 'A selected product is out of stock.');
    const variants = product.product_variants;
    const variant = item.variant_id ? variants.find((v) => v.id === item.variant_id)
      : variants.find((v) => v.is_default) ?? (variants.length === 1 ? variants[0] : undefined);
    if ((item.variant_id || variants.length > 0) && !variant) {
      throw new AppError(400, 'VARIANT_UNAVAILABLE', 'The selected pack is no longer available. Choose a pack again.');
    }
    const price = Number(variant?.price ?? product.price);
    if (!Number.isFinite(price) || price < 0) throw new AppError(409, 'INVALID_PRICE', 'This pack cannot be ordered right now.');
    if (item.expected_unit_price != null && item.expected_unit_price !== price) {
      throw new AppError(409, 'PRICE_CHANGED', 'A pack price has changed. Remove it and add it again to confirm the new price.');
    }
    const variantId = variant?.id ?? null;
    const key = `${product.id}:${variantId ?? ''}`;
    const existing = lines.get(key);
    const quantity = item.quantity + (existing?.quantity ?? 0);
    if (quantity > 999) throw new AppError(400, 'INVALID_CART', 'The maximum quantity for one pack is 999.');
    lines.set(key, { product_id: product.id, variant_id: variantId, quantity, store_id: product.store_id,
      unit_price_at_order: price,
      unit_at_order: variant ? `${Number(variant.quantity)} ${variant.unit_type === 'l' ? 'L' : variant.unit_type}` : product.unit ?? '',
      variant_mrp_at_order: Math.max(price, Number(variant ? variant.original_price ?? price : product.original_price ?? price)) });
  }
  return [...lines.values()];
}

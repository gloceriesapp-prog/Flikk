import type { CheckoutQuote } from '../../../api/checkout';
import { cartIdentity, cartLineId } from '../../../store/cartIdentity';
import type { CartItem } from '../../../store/useCartStore';

// Preserve presentation metadata while all pack details and money come from
// the quote. Legacy carts without a variant resolve to the server default.
export function quotedCartItems(items: CartItem[], quote: CheckoutQuote): CartItem[] {
  return quote.items.map((line) => {
    const source = items.find((item) => {
      const identity = cartIdentity(item);
      return identity.productId === line.product_id && (!identity.variantId || identity.variantId === line.variant_id)
        && (identity.cutSize ?? null) === (line.cut_size ?? null);
    });
    if (!source) throw new Error('Your cart changed. Review it before ordering.');
    return { ...source, id: cartLineId(line.product_id, line.variant_id ?? undefined, line.cut_size ?? undefined), productId: line.product_id,
      variantId: line.variant_id ?? undefined, cutSize: line.cut_size ?? undefined, storeId: line.store_id, quantity: line.quantity,
      price: line.unit_price_at_order, originalPrice: line.variant_mrp_at_order, weight: line.unit_at_order };
  });
}
export function quoteHasPriceChanges(items: CartItem[], quote: CheckoutQuote): boolean {
  return items.some((item) => {
    const identity = cartIdentity(item);
    const line = quote.items.find((entry) => entry.product_id === identity.productId
      && (!identity.variantId || entry.variant_id === identity.variantId) && (entry.cut_size ?? null) === (identity.cutSize ?? null));
    return !line || line.unit_price_at_order !== item.price || line.unit_at_order.replace(/\s/g, '').toLowerCase() !== item.weight.replace(/\s/g, '').toLowerCase();
  });
}

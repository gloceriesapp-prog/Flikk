import type { CheckoutQuote } from '../../../api/checkout';
import { cartIdentity, cartLineId } from '../../../store/cartIdentity';
import type { CartItem } from '../../../store/useCartStore';

// A cart line without a serving matches whatever the server applied (the
// product offers one); a picked one must match exactly.
const sameServing = (picked: string | undefined, quoted: string | null | undefined) => !picked || picked === quoted;

export function matchesQuotedLine(item: Pick<CartItem, 'id' | 'productId' | 'variantId' | 'cutSize' | 'optionId' | 'serving'>, line: CheckoutQuote['items'][number]): boolean {
  const identity = cartIdentity(item);
  return identity.productId === line.product_id && (!identity.variantId || identity.variantId === line.variant_id)
    && (identity.cutSize ?? null) === (line.cut_size ?? null) && (identity.optionId ?? null) === (line.option_id ?? null)
    && sameServing(identity.serving, line.serving);
}
// Preserve presentation metadata while all pack details and money come from
// the quote. Legacy carts without a variant resolve to the server default.
export function quotedCartItems(items: CartItem[], quote: CheckoutQuote): CartItem[] {
  return quote.items.map((line) => {
    const source = items.find(item => matchesQuotedLine(item, line));
    if (!source) throw new Error('Your cart changed. Review it before ordering.');
    // Keep the cart's own serving: a product with one option is served that
    // way by the server without it being part of the cart line.
    const serving = cartIdentity(source).serving;
    return { ...source, id: cartLineId(line.product_id, line.variant_id ?? undefined, line.cut_size ?? undefined, line.option_id ?? undefined, serving), productId: line.product_id,
      variantId: line.variant_id ?? undefined, cutSize: line.cut_size ?? undefined, optionId: line.option_id ?? undefined, serving, storeId: line.store_id, quantity: line.quantity,
      price: line.unit_price_at_order, originalPrice: line.variant_mrp_at_order, weight: line.unit_at_order };
  });
}
export function quoteHasPriceChanges(items: CartItem[], quote: CheckoutQuote): boolean {
  return items.some((item) => {
    const line = quote.items.find(entry => matchesQuotedLine(item, entry));
    return !line || line.unit_price_at_order !== item.price || line.unit_at_order.replace(/\s/g, '').toLowerCase() !== item.weight.replace(/\s/g, '').toLowerCase();
  });
}

// React Query can retain the previous quote for one render after a cart edit
// or successful checkout. Never apply that quote to a different/empty cart.
export function quoteMatchesCart(items: CartItem[], quote: CheckoutQuote): boolean {
  if (!items.length || items.length !== quote.items.length) return false;
  return quote.items.every(line => items.some(item => matchesQuotedLine(item, line) && item.quantity === line.quantity));
}

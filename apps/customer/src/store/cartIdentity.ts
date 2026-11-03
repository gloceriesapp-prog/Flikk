// Chicken piece size (Product.cutOptions products only). Same price.
export type CutSize = 'small' | 'medium' | 'large';
export const CUT_SIZES: readonly CutSize[] = ['small', 'medium', 'large'];
export const CUT_SIZE_LABEL: Record<CutSize, string> = { small: 'Small pieces', medium: 'Medium pieces', large: 'Large pieces' };
// Quick-add buttons on cards add this cut; the detail sheet offers all three.
export const DEFAULT_CUT: CutSize = 'medium';
export const quickAddCut = (product: { cutOptions?: boolean }): CutSize | undefined => (product.cutOptions ? DEFAULT_CUT : undefined);

// A UI line key is never a product ID sent to the API. The same pack in two
// cut sizes is two lines.
export function cartLineId(productId: string, variantId?: string, cutSize?: CutSize): string {
  const base = variantId ? `${productId}::${variantId}` : productId;
  return cutSize ? `${base}#${cutSize}` : base;
}

export function cartIdentity(item: { id: string; productId?: string; variantId?: string; cutSize?: CutSize }) {
  const [legacyProductId, legacyVariantId] = item.id.split('#')[0]!.split('::');
  const productId = item.productId ?? legacyProductId;
  const variantId = item.variantId ?? legacyVariantId;
  // Persisted carts are untrusted: an unknown value is dropped, not sent.
  const cutSize = item.cutSize && CUT_SIZES.includes(item.cutSize) ? item.cutSize : undefined;
  return { productId, variantId, cutSize, id: cartLineId(productId, variantId, cutSize) };
}

export function checkoutItems(items: { id: string; productId?: string; variantId?: string; cutSize?: CutSize; quantity: number; price?: number }[]) {
  return items.map((item) => {
    const { productId, variantId, cutSize } = cartIdentity(item);
    if (variantId?.startsWith('preview-')) throw new Error('Remove the unavailable sample pack from your cart and choose a real pack.');
    return { product_id: productId, variant_id: variantId ?? null, quantity: item.quantity, expected_unit_price: item.price,
      ...(cutSize ? { cut_size: cutSize } : {}) };
  });
}

// Prices may legitimately change in a confirmed server quote; identify the
// purchased draft by real line identities and quantities, independent of price.
export function cartPurchaseSignature(items: { id: string; productId?: string; variantId?: string; cutSize?: CutSize; quantity: number }[]): string {
  return JSON.stringify(items.map(item => ({ ...cartIdentity(item), quantity: item.quantity })).sort((a, b) => a.id.localeCompare(b.id)));
}

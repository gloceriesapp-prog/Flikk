// Chicken piece size (Product.cutOptions products only). Same price.
export type CutSize = 'small' | 'medium' | 'large';
export const CUT_SIZES: readonly CutSize[] = ['small', 'medium', 'large'];
export const CUT_SIZE_LABEL: Record<CutSize, string> = { small: 'Small pieces', medium: 'Medium pieces', large: 'Large pieces' };
// Quick-add buttons on cards add this cut; the detail sheet offers all three.
export const DEFAULT_CUT: CutSize = 'medium';
export const quickAddCut = (product: { cutOptions?: boolean }): CutSize | undefined => (product.cutOptions ? DEFAULT_CUT : undefined);

// Drinks: chilled or room temperature (Product.servingOptions). Same price.
export type Serving = 'chilled' | 'room_temperature';
export const SERVINGS: readonly Serving[] = ['chilled', 'room_temperature'];
export const SERVING_LABEL: Record<Serving, string> = { chilled: 'Chilled', room_temperature: 'Room temperature' };
// Card ADD buttons can't ask questions: a product with flavours, or sold both
// chilled and at room temperature, opens its detail view instead.
export const mustPickInDetail = (product: { options?: unknown[]; servingOptions?: Serving[] }): boolean =>
  (product.options?.length ?? 0) > 0 || (product.servingOptions?.length ?? 0) > 1;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A UI line key is never a product ID sent to the API. The same pack in two
// cut sizes, two flavours, or chilled and room temperature, is two lines.
export function cartLineId(productId: string, variantId?: string, cutSize?: CutSize, optionId?: string, serving?: Serving): string {
  const base = variantId ? `${productId}::${variantId}` : productId;
  return `${cutSize ? `${base}#${cutSize}` : base}${optionId ? `@${optionId}` : ''}${serving ? `!${serving}` : ''}`;
}

export function cartIdentity(item: { id: string; productId?: string; variantId?: string; cutSize?: CutSize; optionId?: string; serving?: Serving }) {
  const [legacyProductId, legacyVariantId] = item.id.split('!')[0]!.split('@')[0]!.split('#')[0]!.split('::');
  const productId = item.productId ?? legacyProductId;
  const variantId = item.variantId ?? legacyVariantId;
  // Persisted carts are untrusted: an unknown value is dropped, not sent.
  const cutSize = item.cutSize && CUT_SIZES.includes(item.cutSize) ? item.cutSize : undefined;
  const optionId = item.optionId && UUID.test(item.optionId) ? item.optionId : undefined;
  const serving = item.serving && SERVINGS.includes(item.serving) ? item.serving : undefined;
  return { productId, variantId, cutSize, optionId, serving, id: cartLineId(productId, variantId, cutSize, optionId, serving) };
}

export function checkoutItems(items: { id: string; productId?: string; variantId?: string; cutSize?: CutSize; optionId?: string; serving?: Serving; quantity: number; price?: number }[]) {
  return items.map((item) => {
    const { productId, variantId, cutSize, optionId, serving } = cartIdentity(item);
    if (variantId?.startsWith('preview-')) throw new Error('Remove the unavailable sample pack from your cart and choose a real pack.');
    return { product_id: productId, variant_id: variantId ?? null, quantity: item.quantity, expected_unit_price: item.price,
      ...(cutSize ? { cut_size: cutSize } : {}), ...(optionId ? { option_id: optionId } : {}), ...(serving ? { serving } : {}) };
  });
}

// Prices may legitimately change in a confirmed server quote; identify the
// purchased draft by real line identities and quantities, independent of price.
export function cartPurchaseSignature(items: { id: string; productId?: string; variantId?: string; cutSize?: CutSize; optionId?: string; serving?: Serving; quantity: number }[]): string {
  return JSON.stringify(items.map(item => ({ ...cartIdentity(item), quantity: item.quantity })).sort((a, b) => a.id.localeCompare(b.id)));
}

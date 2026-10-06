// A UI line key is never a product ID sent to the API.
export function cartLineId(productId: string, variantId?: string): string {
  return variantId ? `${productId}::${variantId}` : productId;
}

export function cartIdentity(item: { id: string; productId?: string; variantId?: string }) {
  const [legacyProductId, legacyVariantId] = item.id.split('::');
  const productId = item.productId ?? legacyProductId;
  const variantId = item.variantId ?? legacyVariantId;
  return { productId, variantId, id: cartLineId(productId, variantId) };
}

export function checkoutItems(items: { id: string; productId?: string; variantId?: string; quantity: number; price?: number }[]) {
  return items.map((item) => {
    const { productId, variantId } = cartIdentity(item);
    if (variantId?.startsWith('preview-')) throw new Error('Remove the unavailable sample pack from your cart and choose a real pack.');
    return { product_id: productId, variant_id: variantId ?? null, quantity: item.quantity, expected_unit_price: item.price };
  });
}

// Prices may legitimately change in a confirmed server quote; identify the
// purchased draft by real line identities and quantities, independent of price.
export function cartPurchaseSignature(items: { id: string; productId?: string; variantId?: string; quantity: number }[]): string {
  return JSON.stringify(items.map(item => ({ ...cartIdentity(item), quantity: item.quantity })).sort((a, b) => a.id.localeCompare(b.id)));
}

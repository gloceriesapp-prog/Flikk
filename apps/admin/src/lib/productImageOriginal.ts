// Originals already stored by /api/upload. Showing this URL explicitly means
// "keep my artwork"; a fitted photo merely referring to it is still processed.
export const PRODUCT_ORIGINALS_SCOPE = '0f1a2b3c-0000-4000-8000-0000000a11c0';
export function isOriginalProductImage(url: string): boolean {
  try { return new URL(url).pathname.startsWith(`/products/${PRODUCT_ORIGINALS_SCOPE}/`); }
  catch { return false; }
}

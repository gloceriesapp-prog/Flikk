export const HORIZONTAL_PRODUCT_CARD_GAP = 12;

// Fit about three cards and a preview of the next one on a phone.
export function horizontalProductCardWidth(viewportWidth: number): number {
  return Math.min(120, Math.max(96, Math.floor((viewportWidth - 48) / 3.2)));
}

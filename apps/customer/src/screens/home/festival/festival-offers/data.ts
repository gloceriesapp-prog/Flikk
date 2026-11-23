export const FESTIVAL_OFFER_LIMIT = 6;

// Missing, invalid or equal comparison prices cannot become an offer. The
// collection applies this before balancing/limiting, so full-price listings
// never displace genuine savings or acquire synthetic discount badges.
export function hasGenuineDiscount(product: { price: number; original_price: number | null }): boolean {
  return Number.isFinite(product.price)
    && product.price > 0
    && typeof product.original_price === 'number'
    && Number.isFinite(product.original_price)
    && product.original_price > product.price;
}

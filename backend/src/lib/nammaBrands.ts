// Namma Brands Home block (GET /home/namma-brands): pure helpers, tested in
// nammaBrands.test.ts. Every number on a card's pill comes from live product
// prices near the customer; nothing is stored or typed in by an admin.

export type PillMode = 'discount' | 'lowest_price';
export const MIN_DISCOUNT_PERCENT = 5;
export const MIN_CARDS = 3;
export const MAX_CARDS = 6;

export interface PricedProduct { id: string; price: number; originalPrice: number | null; inStock: boolean }

// "Upto X% Off" (best discount, rounded down) or "Starting from ₹Y" (lowest
// price). A best discount under 5% reads as the lowest price instead. Only
// in-stock products count; none in stock = no pill (the card is hidden).
export function pillText(mode: PillMode, products: PricedProduct[]): string | null {
  const live = products.filter(p => p.inStock && Number.isFinite(p.price) && p.price > 0);
  if (!live.length) return null;
  if (mode === 'discount') {
    const best = Math.max(...live.map(p => (p.originalPrice && p.originalPrice > p.price ? (p.originalPrice - p.price) / p.originalPrice : 0)));
    const percent = Math.floor(best * 100 + 1e-9);
    if (percent >= MIN_DISCOUNT_PERCENT) return `Upto ${percent}% Off`;
  }
  const lowest = Math.min(...live.map(p => p.price));
  return `Starting from ₹${Number.isInteger(lowest) ? lowest : lowest.toFixed(2)}`;
}

// Photos for a card: the admin's picks that are in stock near the customer,
// else the brand's best sellers here, else its first products. Same count
// as the picks (1 or 2), 2 when none were picked.
export function cardImages(picked: string[], products: { id: string; imageUrl: string | null }[], ranked: string[]): string[] {
  const withPhoto = products.filter(p => p.imageUrl);
  const byId = new Map(withPhoto.map(p => [p.id, p]));
  const want = picked.length ? Math.min(picked.length, 2) : 2;
  const order = [...picked, ...ranked, ...withPhoto.map(p => p.id)];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of order) {
    const product = byId.get(id);
    if (!product || seen.has(id)) continue;
    seen.add(id);
    out.push(product.imageUrl!);
    if (out.length === want) break;
  }
  return out;
}

// Admin preview copy of the Namma Brands pill maths. The customer app's text
// comes from backend/src/lib/nammaBrands.ts (source of truth, tested there);
// keep these two in step.
export type PillMode = 'discount' | 'lowest_price';
export interface NammaProduct { id: string; name: string; imageUrl: string | null; price: number; mrp: number | null; storeName: string }
export interface NammaCard { brandId: string; brandName: string; title: string; productIds: string[]; pillMode: PillMode }
export const MAX_NAMMA_CARDS = 6;

export function previewPill(mode: PillMode, products: NammaProduct[]): string | null {
  const live = products.filter((p) => p.price > 0);
  if (!live.length) return null;
  if (mode === 'discount') {
    const best = Math.max(...live.map((p) => (p.mrp && p.mrp > p.price ? (p.mrp - p.price) / p.mrp : 0)));
    const percent = Math.floor(best * 100 + 1e-9);
    if (percent >= 5) return `Upto ${percent}% Off`;
  }
  const lowest = Math.min(...live.map((p) => p.price));
  return `Starting from ₹${Number.isInteger(lowest) ? lowest : lowest.toFixed(2)}`;
}

// Same two-line title split as the customer app (NammaBrandsSection.tsx).
export function twoLineTitle(title: string): string {
  const text = title.trim().replace(/\s+/g, ' ');
  const spaces = [...text.matchAll(/ /g)].map((match) => match.index!);
  if (!spaces.length) return text;
  const split = spaces.reduce((best, at) => (Math.abs(text.length - 2 * at) < Math.abs(text.length - 2 * best) ? at : best));
  return `${text.slice(0, split)}\n${text.slice(split + 1)}`;
}

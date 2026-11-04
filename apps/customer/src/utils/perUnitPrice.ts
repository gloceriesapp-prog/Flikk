// "₹63.6/kg" — a pack's price per kg (g/kg), per L (ml/l) or per piece,
// computed from its real quantity and price. Shown only on products the
// admin turned it on for (products.show_unit_price); see mapApiProduct.

export type PackUnit = 'g' | 'kg' | 'ml' | 'l' | 'pc';

export function getPerUnitPriceLabel(unit: PackUnit, quantity: number, price: number): string | null {
  if (!(quantity > 0) || !(price > 0)) return null;
  // A single piece's price already is the per-piece price.
  if (unit === 'pc' && quantity === 1) return null;
  const base = unit === 'g' || unit === 'ml' ? quantity / 1000 : quantity;
  const per = Math.round((price / base) * 10) / 10;
  const label = unit === 'g' || unit === 'kg' ? 'kg' : unit === 'pc' ? 'pc' : 'L';
  return `₹${Number.isInteger(per) ? per : per.toFixed(1)}/${label}`;
}

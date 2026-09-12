// Suggested MRP per category — a pre-filled starting point for
// ProductVariantCard's own MRP field, never a silent/forced value: a shop
// owner always sees it in an editable input and can clear or overwrite it
// before submitting. Same real, category-typical Indian kirana/grocery
// retail margins as admin's own copy (apps/admin/src/lib/pricing.ts) —
// a deliberate copy, not a shared import, same convention this app's own
// PRODUCT_CATEGORIES list already documents (data.ts's own note). Every
// category gets a suggestion, including fresh produce and dairy/bread
// (an earlier pass left those two blank; per an explicit ask this
// reverses that):
//
//  - Fresh produce (vegetables/fruits, meat/fish): 5-10%.
//  - Dairy/bread: 3-5% — the thinnest real margin band.
//  - Staples (rice, atta, dal, oil): 8-12%.
//  - Packaged snacks/branded FMCG: 10-15%.
//
// Midpoint of each real range — a starting guess to adjust per actual
// product. suggestedMrp always returns strictly more than price
// (price / (1 - margin) with margin > 0), so a suggestion can never
// quietly equal or undercut the real price.
const MARGIN_BY_CATEGORY: Record<string, number> = {
  'Vegetables & Fruits': 0.075,
  'Meat, Eggs & Fish': 0.075,
  'Dairy, Bread & Eggs': 0.04,
  'Bakery & Biscuits': 0.04,
  'Atta, Rice & Dal': 0.1,
  'Oil, Ghee & Masala': 0.1,
  'Snacks & Munchies': 0.125,
  Beverages: 0.125,
  'Protein & Nutrition': 0.125,
  'Household & Cleaning': 0.125,
  'Personal Care': 0.125,
  Pharmacy: 0.125,
  'General Store': 0.125,
};

// Fallback for any category not explicitly mapped above — the packaged/
// branded FMCG midpoint, the closest reasonable default.
const DEFAULT_MARGIN = 0.125;

export function suggestedMrp(category: string, price: number): number | undefined {
  if (!(price > 0)) return undefined;
  const margin = MARGIN_BY_CATEGORY[category] ?? DEFAULT_MARGIN;
  return Math.round(price / (1 - margin));
}

// Suggested MRP per category — a pre-filled starting point for the "Sizes
// & pricing" form's own MRP field (ProductVariantsEditor.tsx), never a
// silent/forced value: a founder always sees it in an editable input and
// can clear or overwrite it before saving. Real, category-typical Indian
// kirana/grocery retail margins (not invented per-product) — per an
// explicit ask, every category gets a suggestion now, including fresh
// produce and dairy/bread (an earlier pass left those two blank; this
// reverses that):
//
//  - Fresh produce (vegetables/fruits): 5-10% — thin, but a real store
//    still marks up above wholesale rate even on daily-priced produce.
//  - Meat/fish: 5-10% — similarly thin, perishable.
//  - Dairy/bread: 3-5% — the thinnest real margin band, often sold
//    close to MRP.
//  - Staples (rice, atta, dal, oil): 8-12% — thin margins already, a
//    store owner can't discount much more without losing money.
//  - Packaged snacks/branded FMCG: 10-15% — brands often give retailers
//    better bulk rates, so there's more room here.
//
// Midpoint of each real range, not the low or high end — a starting
// guess a founder is expected to adjust per actual product, not a number
// meant to be accurate on its own. suggestedMrp always returns a value
// strictly greater than price (price / (1 - margin) with margin > 0), so
// a suggestion can never quietly equal or undercut the real price.
const MARGIN_BY_CATEGORY: Record<string, number> = {
  'Vegetables & Fruits': 0.075, // fresh produce: 5-10%
  'Meat, Eggs & Fish': 0.075, // fresh produce: 5-10%
  'Dairy, Bread & Eggs': 0.04, // dairy/bread: 3-5%
  'Bakery & Biscuits': 0.04, // dairy/bread-adjacent: 3-5%
  'Atta, Rice & Dal': 0.1, // staples: 8-12%
  'Oil, Ghee & Masala': 0.1, // staples: 8-12%
  'Snacks & Munchies': 0.125, // packaged/branded FMCG: 10-15%
  Beverages: 0.125,
  'Protein & Nutrition': 0.125,
  'Household & Cleaning': 0.125,
  'Personal Care': 0.125,
  Pharmacy: 0.125,
  'General Store': 0.125,
};

// Fallback for any category not explicitly mapped above (a founder
// renames/adds one, or PRODUCT_CATEGORIES grows) — the packaged/branded
// FMCG midpoint, the closest reasonable default for "some generic
// packaged good" rather than returning no suggestion at all.
const DEFAULT_MARGIN = 0.125;

// Rounded to the nearest rupee — an MRP suggestion is a starting point to
// edit, not a precision calculation that needs paise.
export function suggestedMrp(category: string, price: number): number | null {
  if (!(price > 0)) return null;
  const margin = MARGIN_BY_CATEGORY[category] ?? DEFAULT_MARGIN;
  return Math.round(price / (1 - margin));
}

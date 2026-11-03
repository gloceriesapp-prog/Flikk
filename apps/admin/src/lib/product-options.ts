// Static reference data for the Add/Edit product forms — category taxonomy
// and unit-size presets. Not fetched from anywhere: this dashboard has no
// login flow yet, so it can't call the backend's authenticated /admin/*
// endpoints (see AddProductModal's own note); these are a deliberate,
// documented copy of the same shape backend/src/lib/products.ts validates
// against, not a second, drifting definition invented independently.

// Product categories are the admin's own list (Categories page, the
// `categories` table), fetched by ProductCategorySelect — no built-in list.

// Fallback card background when a product photo has no background left to
// extract a color from (transparent/no-bg photo, or extraction failed) —
// see lib/bgColor.ts's own note on the full fallback chain. Same neutral
// --mist token every other surface in this dashboard already uses.
export const MIST_FALLBACK = '#F6FAF0';

// Veg/non-veg only makes sense where an animal-origin option exists. The
// category names are the admin's own, so match on the words, not a list.
export function categoryHasVegToggle(category: string): boolean {
  return /meat|chicken|mutton|fish|egg|dairy|non.?veg/i.test(category);
}

// Cut sizes and bulk orders are for chicken (meat) products only; the per-
// product toggle is the real switch, this just decides where it is offered.
export function categoryAllowsCutOptions(category: string | null | undefined): boolean {
  return /chicken|meat/i.test(category ?? '');
}

// One pastel tint per category, used when a product's own photo yields no
// usable color (see lib/bgColor.ts). Deliberately capped to the same
// pastel range generateProductBgColor forces real extracted colors into
// (low saturation, high lightness) so a category-fallback card never reads
// visually different from a real-photo one.
export const CATEGORY_TINT_MAP: Record<string, string> = {
  'Vegetables & Fruits': '#E9F5E1',
  'Dairy, Bread & Eggs': '#FFF6E5',
  'Atta, Rice & Dal': '#F5EFE3',
  'Oil, Ghee & Masala': '#FDF0E0',
  'Meat, Eggs & Fish': '#FBEAE8',
  'Bakery & Biscuits': '#FBF0E4',
  'Snacks & Munchies': '#FDF2D9',
  Beverages: '#E7F3F7',
  'Protein & Nutrition': '#EEF3E6',
  'Household & Cleaning': '#E9F0F7',
  'Personal Care': '#F6EAF3',
  Pharmacy: '#E8F1F7',
  'General Store': MIST_FALLBACK,
};

export type UnitType = 'g' | 'kg' | 'ml' | 'l' | 'pc';

export const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'ml', label: 'Millilitres (ml)' },
  { value: 'l', label: 'Litres (L)' },
  { value: 'pc', label: 'Pieces' },
];

// g/ml are picked from a fixed preset — these are the real pack sizes an
// Indian kirana store actually stocks (a 250 g dal packet, a 500 ml oil
// pouch), not an arbitrary free number a store owner might fat-finger.
// kg/l/pc are deliberately NOT a preset list of every whole number — a
// store owner needs to enter genuinely custom quantities (2.5 kg of rice,
// 1.5 L of oil, a dozen eggs), so those three stay free numeric input
// instead, per an explicit ask not to enumerate "all kg" as fixed options.
export const GRAM_PRESETS = [50, 100, 200, 250, 500, 750];
export const ML_PRESETS = [100, 200, 250, 500, 750, 1000];

export function hasFixedPresets(unitType: UnitType): boolean {
  return unitType === 'g' || unitType === 'ml';
}

export function presetsForUnit(unitType: UnitType): number[] {
  return unitType === 'g' ? GRAM_PRESETS : ML_PRESETS;
}

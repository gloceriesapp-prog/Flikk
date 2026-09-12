// Static reference data for the Add/Edit product forms — category taxonomy
// and unit-size presets. Not fetched from anywhere: this dashboard has no
// login flow yet, so it can't call the backend's authenticated /admin/*
// endpoints (see AddProductModal's own note); these are a deliberate,
// documented copy of the same shape backend/src/lib/products.ts validates
// against, not a second, drifting definition invented independently.

// Matches the customer app's own category vocabulary where one exists
// (apps/customer/src/screens/home/*/data.ts categoryLabel values — Vegetables
// & Fruits, Dairy Bread & Eggs, Atta Rice & Dal, Oil Ghee & Masala) extended
// with the rest of a Blinkit/Instamart-style top-level taxonomy scaled down
// to what a kirana/pharmacy zone actually stocks (CLAUDE.md scope) — no
// electronics/fashion/toys buckets a store in this zone won't sell.
export const PRODUCT_CATEGORIES = [
  'Vegetables & Fruits',
  'Dairy, Bread & Eggs',
  'Atta, Rice & Dal',
  'Oil, Ghee & Masala',
  'Meat, Eggs & Fish',
  'Bakery & Biscuits',
  'Snacks & Munchies',
  'Beverages',
  'Protein & Nutrition',
  'Household & Cleaning',
  'Personal Care',
  'Pharmacy',
  'General Store',
] as const;

// Fallback card background when a product photo has no background left to
// extract a color from (transparent/no-bg photo, or extraction failed) —
// see lib/bgColor.ts's own note on the full fallback chain. Same neutral
// --mist token every other surface in this dashboard already uses.
export const MIST_FALLBACK = '#F6FAF0';

// Veg/non-veg only makes sense where a real animal-origin option exists —
// meat/fish itself, and dairy/eggs/bread (eggs share that category, and a
// veg-vs-egg distinction is a real thing a customer cares about there).
// Every other category (Vegetables & Fruits, Personal Care, Household,
// Pharmacy, etc.) has no real non-veg variant to distinguish from, so the
// toggle doesn't show there at all — per an explicit ask, not just hidden
// behind a default.
const VEG_TOGGLE_CATEGORIES = new Set(['Meat, Eggs & Fish', 'Dairy, Bread & Eggs']);

export function categoryHasVegToggle(category: string): boolean {
  return VEG_TOGGLE_CATEGORIES.has(category);
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

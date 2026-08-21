// Placeholder catalog (P4) — same no-auth caveat as ../orders/data.ts.
// Shape mirrors `products` (specs/00-foundation/data-model.md), extended
// with `variants`: loose produce (Vegetables) is sold at multiple weights
// (250 g / 500 g / 1 kg, each independently priced and stocked, same as
// Blinkit/Instamart's onion-tomato-potato pattern) while packaged goods
// (Dairy, Staples) come in one fixed pack size from the manufacturer, so
// they get a single variant. `unit`/`price`/`isInStock` on the product
// itself stay as a row-summary rollup (see summarizeVariants below) —
// the variants array is the source of truth once `PATCH /partner/products`
// exists.

export interface ProductVariant {
  id: string;
  label: string;
  price: number;
  isInStock: boolean;
  // Optional — a shop owner may not always know or care to track an exact
  // count. `undefined` means "not tracked", not "zero".
  stockQuantity?: number;
}

export interface PartnerProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  isInStock: boolean;
  variants: ProductVariant[];
}

function singleVariant(label: string, price: number, isInStock: boolean): ProductVariant[] {
  return [{ id: 'default', label, price, isInStock }];
}

// Rolls a product's variants back up into the summary fields shown on the
// catalog row: unit/price follow the cheapest in-stock variant (falling
// back to the first variant if none are in stock), isInStock is true if
// any variant is sellable. Called after every sheet save.
export function summarizeVariants(variants: ProductVariant[]): Pick<PartnerProduct, 'unit' | 'price' | 'isInStock'> {
  const inStock = variants.filter((v) => v.isInStock);
  const summaryVariant = (inStock.length > 0 ? inStock : variants).reduce((cheapest, v) =>
    v.price < cheapest.price ? v : cheapest
  );
  return { unit: summaryVariant.label, price: summaryVariant.price, isInStock: inStock.length > 0 };
}

// Sizes a shop owner can add a product in — picked from a fixed list, not
// typed free-hand. Two reasons: (1) a customer ordering later picks from
// these same labels, so "500 gm" vs "500g" vs "half kg" typed three
// different ways across a catalog would read as three different sizes to
// them; (2) these are the sizes Indian kirana/pharmacy retail actually
// transacts in — not arbitrary.
//
// Loose produce (Vegetables/Fruits) is bought by the kilo — a customer
// says "500 g onion" or "2 kg tomato", so the shop owner needs a wider kg
// ladder here, up to 5 kg. Packaged goods only ever exist in whatever
// fixed sizes the manufacturer actually presses/bottles.
const LOOSE_PRODUCE_CATEGORIES = ['Vegetables', 'Fruits'];

const LOOSE_PRODUCE_SIZES = ['100 g', '250 g', '500 g', '750 g', '1 kg', '2 kg', '5 kg'];
const PACKAGED_WEIGHT_SIZES = ['50 g', '100 g', '200 g', '250 g', '500 g', '750 g', '1 kg'];
const PACKAGED_VOLUME_SIZES = ['100 ml', '200 ml', '250 ml', '500 ml', '1 L'];

// Whether an existing variant on this product is sold by volume (milk,
// ghee, oil) rather than weight — inferred from its own label rather than
// a separate field, since nothing else in the data model tracks it yet.
function isVolumeProduct(variants: ProductVariant[]): boolean {
  return variants.some((v) => /\b(ml|l)$/i.test(v.label.trim()));
}

export function standardSizeOptions(category: string, existingVariants: ProductVariant[]): string[] {
  if (LOOSE_PRODUCE_CATEGORIES.includes(category)) return LOOSE_PRODUCE_SIZES;
  return isVolumeProduct(existingVariants) ? PACKAGED_VOLUME_SIZES : PACKAGED_WEIGHT_SIZES;
}

// Shown on the Inventory summary card up top — real "last updated" comes
// from `GET /partner/products` once that call exists (same no-auth caveat
// as the products list itself).
export const CATALOG_LAST_UPDATED_LABEL = 'Updated 1 Jun, 26';

const PLACEHOLDER_BASE: Omit<PartnerProduct, 'unit' | 'price' | 'isInStock'>[] = [
  {
    id: 'p1',
    name: 'Nandini Pouch Curd',
    category: 'Dairy',
    variants: singleVariant('500 g', 28, true),
  },
  {
    id: 'p2',
    name: 'Nandini Toned Milk',
    category: 'Dairy',
    variants: singleVariant('500 ml', 24, true),
  },
  {
    id: 'p3',
    name: 'Onion (Eerulli)',
    category: 'Vegetables',
    variants: [
      { id: 'p3-250g', label: '250 g', price: 10, isInStock: true },
      { id: 'p3-500g', label: '500 g', price: 18, isInStock: true },
      { id: 'p3-1kg', label: '1 kg', price: 34, isInStock: true },
    ],
  },
  {
    id: 'p4',
    name: 'Basmati Rice',
    category: 'Staples',
    variants: singleVariant('1 kg', 95, false),
  },
  {
    id: 'p5',
    name: 'Cow Ghee',
    category: 'Dairy',
    variants: singleVariant('500 ml', 320, true),
  },
  {
    id: 'p6',
    name: 'Toor Dal',
    category: 'Staples',
    variants: singleVariant('500 g', 68, false),
  },
];

export const PLACEHOLDER_PRODUCTS: PartnerProduct[] = PLACEHOLDER_BASE.map((base) => ({
  ...base,
  ...summarizeVariants(base.variants),
}));

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
  imageUrl: string | null;
  // 'pending' the moment this store owner adds it (POST /partner/products
  // always inserts pending — backend/src/routes/partner.ts's own note) —
  // invisible to customers until a founder approves it in admin.
  // 'approved'/'rejected' after a decision. InventoryProductListCard/
  // ProductRow show a badge for anything not 'approved'.
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

// Same fixed vocabulary as admin's own Add/Edit product form
// (apps/admin/src/lib/product-options.ts PRODUCT_CATEGORIES) — a store
// owner and a founder picking from two different category lists would
// fragment the customer app's own category filtering, so this is a
// deliberate copy, not a smaller stand-in list.
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
const LOOSE_PRODUCE_CATEGORIES = ['Vegetables & Fruits'];

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

// Backend's own VariantInput shape (backend/src/lib/products.ts) — what
// POST /partner/products actually expects per size, distinct from this
// screen's own label-based ProductVariant editing UI.
export type BackendUnitType = 'g' | 'kg' | 'ml' | 'l' | 'pc';
export interface BackendVariantInput {
  unitType: BackendUnitType;
  quantity: number;
  price: number;
}

// Every label this screen ever produces comes from standardSizeOptions
// above (never typed free-hand) — always "<number> <g|kg|ml|L>" — so this
// parse is exhaustive over what a shop owner can actually pick, not a
// general-purpose unit parser.
export function parseVariantLabel(label: string, price: number): BackendVariantInput {
  const match = /^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)$/i.exec(label.trim());
  if (!match) throw new Error(`Unrecognized size "${label}".`);
  const [, qty, unit] = match;
  return { unitType: unit.toLowerCase() as BackendUnitType, quantity: Number(qty), price };
}

// A partner app's catalog is one store's own listing — there's no
// cross-store "cheapest wins" collapse here like admin's Inventory screen,
// just the one rule that actually applies at this level: a shop owner
// can't list the same product twice under two different rows (that's what
// variants are for — Onion at 250g/500g/1kg is one row, not three). Match
// is case/whitespace-insensitive, same as admin's own duplicate check.
export function isDuplicateProductName(products: PartnerProduct[], name: string, excludeProductId?: string): boolean {
  const normalized = name.trim().toLowerCase();
  return products.some((p) => p.id !== excludeProductId && p.name.trim().toLowerCase() === normalized);
}

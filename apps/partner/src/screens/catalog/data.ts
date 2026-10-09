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
  // Counted retail packs of THIS size on hand (product_variants.
  // stock_quantity). Checkout only sells counted packs, so the add/edit
  // screens require it; `undefined` means "never counted", not "zero".
  stockQuantity?: number;
  // Optional MRP — undefined means "no MRP set", not zero/free. Auto-
  // suggested per category (pricing.ts's own suggestedMrp) the moment a
  // price is entered and this is still empty, but always a normal
  // editable field afterward — never silently forced.
  originalPrice?: number;
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
  // Total counted packs across sizes (products.stock_quantity), null when
  // the shop has never confirmed stock for this product.
  stockQuantity: number | null;
  // 'pending' the moment this store owner adds it (POST /partner/products
  // always inserts pending — backend/src/routes/partner.ts's own note) —
  // invisible to customers until a founder approves it in admin.
  // 'approved'/'rejected' after a decision. InventoryProductListCard/
  // ProductRow show a badge for anything not 'approved'.
  approvalStatus: 'pending' | 'approved' | 'rejected';
  // A name or price edit to this LIVE product is waiting for admin review
  // (products.pending_changes, migration 115) — customers still see the
  // approved name/prices shown here until it's approved.
  hasPendingChanges?: boolean;
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
  // Real product_variants.id when editing a loaded pack, so the backend
  // updates it in place (keeping its stock) instead of replacing it.
  id?: string;
  unitType: BackendUnitType;
  quantity: number;
  price: number;
  originalPrice?: number;
  // Counted packs on hand for this size; enables stock tracking.
  stockQuantity?: number;
}

// Every label this screen ever produces comes from standardSizeOptions
// above (never typed free-hand) — always "<number> <g|kg|ml|L>" — so this
// parse is exhaustive over what a shop owner can actually pick, not a
// general-purpose unit parser.
export function parseVariantLabel(label: string, price: number, originalPrice?: number): BackendVariantInput {
  const match = /^(\d+(?:\.\d+)?)\s*(g|kg|ml|l|pc)$/i.exec(label.trim());
  if (!match) throw new Error(`Unrecognized size "${label}".`);
  const [, qty, unit] = match;
  return { unitType: unit.toLowerCase() as BackendUnitType, quantity: Number(qty), price, originalPrice };
}

const PACK_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What add/edit actually send per size: the parsed label + price, the real
// pack id (local draft ids like "new-500 g-…" are never sent) and the count.
export function toBackendVariant(variant: ProductVariant): BackendVariantInput {
  const input = parseVariantLabel(variant.label, variant.price, variant.originalPrice);
  if (PACK_ID.test(variant.id)) input.id = variant.id;
  if (variant.stockQuantity !== undefined) input.stockQuantity = variant.stockQuantity;
  return input;
}

// Checkout refuses packs whose stock was never confirmed, so a product is
// only saved once every size has a count (0 is a valid count).
export function hasUncountedVariant(variants: ProductVariant[]): boolean {
  return variants.some((v) => v.stockQuantity === undefined);
}

// The Available / Out of stock toggle and the count field drive each other:
// "Out of stock" is a count of 0, and a count above 0 is available.
// Switching a 0-count size back to Available clears the count so the shop
// owner types how many packs they actually have.
export function withStockToggle(variant: ProductVariant, isInStock: boolean): ProductVariant {
  if (!isInStock) return { ...variant, isInStock, stockQuantity: 0 };
  return { ...variant, isInStock, stockQuantity: variant.stockQuantity === 0 ? undefined : variant.stockQuantity };
}

export function withStockCount(variant: ProductVariant, rawCount: string): ProductVariant {
  const digits = rawCount.replace(/[^0-9]/g, '');
  if (digits === '') return { ...variant, stockQuantity: undefined };
  const stockQuantity = Number(digits);
  return { ...variant, stockQuantity, isInStock: stockQuantity > 0 };
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

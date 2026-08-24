// Product catalog — write-path validation + row mapping shared by every
// route that can create/edit a product: routes/partner.ts (a store owner,
// scoped to their own store) and routes/admin.ts (a founder, any store).
// Single source of truth so the two routers can't drift into checking
// different things for the same table — a rule tightened here tightens it
// everywhere a product gets written, not just on whichever route someone
// remembered to update.
//
// Source: specs/00-foundation/data-model.md (products table) — stock_status
// is the 3-state field the admin dashboard needs (in_stock/low_stock/
// out_of_stock); is_in_stock (the customer app's simpler boolean) is kept
// in sync by a DB trigger, not here, so nothing on the write path needs to
// know about it.
//
// Per-size pricing (Blinkit/Instamart model): a product is created with one
// or more *variants* — 250 g Onion at ₹15 and 1 kg Onion at ₹52 are two
// variant rows under one product, not two products, and each size genuinely
// has its own price rather than one price scaled by weight. variants[0] is
// always the default/primary listing; its price/unit get denormalized onto
// the products row itself (see toProductRow) so every existing reader that
// only knows about products.price/unit keeps working unchanged — the full
// per-size breakdown lives in product_variants (toVariantRows).

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type UnitType = 'g' | 'kg' | 'ml' | 'l' | 'pc';

const STOCK_STATUSES: StockStatus[] = ['in_stock', 'low_stock', 'out_of_stock'];
const UNIT_TYPES: UnitType[] = ['g', 'kg', 'ml', 'l', 'pc'];

// One size of a product — price is per-size, never derived by scaling a
// base price by quantity (a 1kg pack isn't always exactly 4x a 250g pack in
// a real kirana store's pricing, bulk discounts and rounding both apply).
export interface VariantInput {
  unitType: UnitType;
  quantity: number;
  price: number;
  originalPrice?: number | null;
}

// What a caller (partner or admin route) sends in. storeId is intentionally
// separate from the rest — routes/partner.ts derives it server-side from
// the caller's own store (never trusts a client-supplied one), while
// routes/admin.ts takes it straight from the request body since a founder
// can write to any store. Neither route hands this type raw user input
// without running it through validateProductInput first.
export interface ProductInput {
  storeId: string;
  name: string;
  category: string;
  stockStatus: StockStatus;
  imageUrl?: string | null;
  localName?: string | null;
  isVeg?: boolean;
  freshnessTag?: string | null;
  description?: string | null;
  variants: VariantInput[];
}

// The products table's own column shape (snake_case) — price/unit/
// original_price are the default variant's, denormalized. Routes pass the
// result of toProductRow straight to `.insert()`/`.update()`.
export interface ProductRow {
  store_id: string;
  name: string;
  unit: string;
  price: number;
  original_price: number | null;
  category: string;
  stock_status: StockStatus;
  image_url: string | null;
  local_name: string | null;
  is_veg: boolean;
  freshness_tag: string | null;
  description: string | null;
}

// product_variants' own column shape. product_id is filled in by the route
// after the parent product insert returns its generated id — toVariantRows
// takes it as a parameter rather than expecting it on VariantInput, since
// it doesn't exist yet at validation time for a brand-new product.
export interface ProductVariantRow {
  product_id: string;
  unit_type: UnitType;
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateVariant(variant: Partial<VariantInput>, index: number): asserts variant is VariantInput {
  const label = `variants[${index}]`;
  if (!variant.unitType || !UNIT_TYPES.includes(variant.unitType)) {
    throw new Error(`${label}.unitType must be one of: ${UNIT_TYPES.join(', ')}.`);
  }
  if (!isFiniteNumber(variant.quantity) || variant.quantity <= 0) {
    throw new Error(`${label}.quantity must be a positive number.`);
  }
  if (!isFiniteNumber(variant.price) || variant.price < 0) {
    throw new Error(`${label}.price must be a non-negative number.`);
  }
  if (
    variant.originalPrice != null &&
    (!isFiniteNumber(variant.originalPrice) || variant.originalPrice < 0)
  ) {
    throw new Error(`${label}.originalPrice must be a non-negative number when set.`);
  }
}

// Throws a plain Error with a message safe to surface to the caller (the
// route wraps it in a 400 AppError) — never a generic "invalid input", the
// message always names the actual field and constraint that failed, since
// that's the difference between a founder/store-owner fixing their input
// in one try versus guessing.
export function validateProductInput(input: Partial<ProductInput>): asserts input is ProductInput {
  if (!input.storeId) throw new Error('storeId is required.');
  if (!input.name || !input.name.trim()) throw new Error('name is required.');
  if (!input.category || !input.category.trim()) throw new Error('category is required.');
  if (!input.stockStatus || !STOCK_STATUSES.includes(input.stockStatus)) {
    throw new Error(`stockStatus must be one of: ${STOCK_STATUSES.join(', ')}.`);
  }
  if (!Array.isArray(input.variants) || input.variants.length === 0) {
    throw new Error('At least one size (variants) is required.');
  }
  input.variants.forEach((variant, index) => validateVariant(variant, index));
}

// "250 g" / "1 kg" / "500 ml" / "1 L" / "2 pc" — kg and l are the only unit
// types a partner enters as a free custom number rather than picking from a
// fixed preset (see PRODUCT_UNIT_PRESETS's own note on why), so this has to
// handle arbitrary quantities like 2.5 kg, not just the gram/ml presets.
export function formatVariantUnit(variant: VariantInput): string {
  const qty = Number.isInteger(variant.quantity) ? variant.quantity : variant.quantity.toFixed(2).replace(/\.?0+$/, '');
  const unitLabel: Record<UnitType, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };
  return `${qty} ${unitLabel[variant.unitType]}`;
}

// originalPrice only makes sense (and is only ever displayed, see the
// customer app's own ProductCard/ProductDetailInfo) as a real discount —
// silently drop it rather than storing a "discount" that's actually a
// markup or a no-op, the same guard every UI that reads this field already
// applies on the way out.
function resolveOriginalPrice(price: number, originalPrice: number | null | undefined): number | null {
  return originalPrice != null && originalPrice > price ? originalPrice : null;
}

export function toProductRow(input: ProductInput): ProductRow {
  // validateProductInput guarantees variants.length >= 1 at runtime, but
  // TS's noUncheckedIndexedAccess can't see that guarantee across the two
  // function calls — every route calls validateProductInput immediately
  // before toProductRow (never toProductRow on its own), so this is a
  // real invariant, not an assumption.
  const defaultVariant = input.variants[0];
  if (!defaultVariant) throw new Error('At least one size (variants) is required.');

  return {
    store_id: input.storeId,
    name: input.name.trim(),
    unit: formatVariantUnit(defaultVariant),
    price: defaultVariant.price,
    original_price: resolveOriginalPrice(defaultVariant.price, defaultVariant.originalPrice),
    category: input.category.trim(),
    stock_status: input.stockStatus,
    image_url: input.imageUrl?.trim() || null,
    local_name: input.localName?.trim() || null,
    is_veg: input.isVeg ?? true,
    freshness_tag: input.freshnessTag?.trim() || null,
    description: input.description?.trim() || null,
  };
}

export function toVariantRows(productId: string, variants: VariantInput[]): ProductVariantRow[] {
  return variants.map((variant, index) => ({
    product_id: productId,
    unit_type: variant.unitType,
    quantity: variant.quantity,
    price: variant.price,
    original_price: resolveOriginalPrice(variant.price, variant.originalPrice),
    is_default: index === 0,
  }));
}

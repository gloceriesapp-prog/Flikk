// Deliberate copy of backend/src/lib/products.ts's validation + row-mapping
// logic (variant → product_row denormalization, originalPrice-only-if-
// actually-a-discount, unit-label formatting) — NOT a second, independently-
// invented definition. This dashboard's Add/Edit product API routes
// (app/api/products/*) write straight to Supabase with the service-role
// key instead of calling the backend's authenticated /admin/products
// (no login flow exists here yet, see that route's own note), so the same
// validation has to live in both places until that gap closes. When it
// does, delete this file and call the backend instead — don't let it drift
// as a second copy of the rules past that point.

import { CATEGORY_TINT_MAP, MIST_FALLBACK, type UnitType } from './product-options';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface VariantInput {
  // product_variants.id of a pack loaded for editing — save_catalogue_product
  // (backend migration 111) updates that pack in place, keeping its stock.
  id?: string | null;
  unitType: UnitType;
  quantity: number;
  price: number;
  originalPrice?: number | null;
  // Counted retail packs on hand. Absent keeps an existing pack's count; a
  // number sets it and turns on stock tracking (checkout requires it).
  stockQuantity?: number | null;
}

export interface ProductWriteInput {
  storeId: string;
  name: string;
  category: string;
  stockStatus: StockStatus;
  imageUrl?: string | null;
  // Gallery photos after the cover (products.extra_image_urls). Absent leaves
  // the saved list alone; an array replaces it.
  extraImageUrls?: string[] | null;
  // Chicken cut sizes + bulk threshold (kg). Absent leaves them unchanged.
  cutOptionsEnabled?: boolean | null;
  bulkMinKg?: number | null;
  // Extracted from imageUrl at upload time (app/api/upload -> lib/bgColor.ts),
  // null when extraction failed or no photo was set — toProductRow below
  // is where the category-tint/mist fallback steps of that chain run.
  bgColor?: string | null;
  localName?: string | null;
  isVeg?: boolean;
  freshnessTag?: string | null;
  description?: string | null;
  // Real sub_categories.id — powers CategoryDetailScreen's own product grid
  // on the customer app (GET /categories/subcategories/:id/products).
  // Optional and independent of `category` above (that's the free-text
  // PRODUCT_CATEGORIES field this form already had) — the two taxonomies
  // aren't unified yet, see backend/src/routes/categories.ts's own note.
  subCategoryId?: string | null;
  variants: VariantInput[];
}

const UNIT_TYPES: UnitType[] = ['g', 'kg', 'ml', 'l', 'pc'];
const STOCK_STATUSES: StockStatus[] = ['in_stock', 'low_stock', 'out_of_stock'];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateProductInput(input: Partial<ProductWriteInput>): asserts input is ProductWriteInput {
  if (!input.storeId) throw new Error('storeId is required.');
  if (!input.name || !input.name.trim()) throw new Error('name is required.');
  if (!input.category || !input.category.trim()) throw new Error('category is required.');
  if (!input.stockStatus || !STOCK_STATUSES.includes(input.stockStatus)) {
    throw new Error(`stockStatus must be one of: ${STOCK_STATUSES.join(', ')}.`);
  }
  if (!Array.isArray(input.variants) || input.variants.length === 0) {
    throw new Error('At least one size is required.');
  }
  input.variants.forEach((variant, index) => {
    const label = `Size ${index + 1}`;
    if (!variant.unitType || !UNIT_TYPES.includes(variant.unitType)) throw new Error(`${label}: pick a unit type.`);
    if (!isFiniteNumber(variant.quantity) || variant.quantity <= 0) throw new Error(`${label}: quantity must be positive.`);
    if (!isFiniteNumber(variant.price) || variant.price < 0) throw new Error(`${label}: price must be non-negative.`);
    if (variant.originalPrice != null && (!isFiniteNumber(variant.originalPrice) || variant.originalPrice < 0)) {
      throw new Error(`${label}: MRP must be non-negative when set.`);
    }
    if (variant.stockQuantity != null && (!Number.isSafeInteger(variant.stockQuantity) || variant.stockQuantity < 0)) {
      throw new Error(`${label}: stock must be a whole number, 0 or more.`);
    }
  });
  if (new Set(input.variants.map((v) => `${v.unitType}:${v.quantity}`)).size !== input.variants.length) {
    throw new Error('Each size can only be listed once.');
  }
}

// Matches products_extra_image_urls_check (backend migration 20261104120000).
export const MAX_EXTRA_IMAGES = 7;

// The gallery list to store, or undefined to leave it untouched. Blank and
// repeated entries (and a copy of the cover) are dropped rather than refused,
// since the form can produce them while photos are being swapped around.
export function toExtraImageUrls(input: Pick<ProductWriteInput, 'imageUrl' | 'extraImageUrls'>): string[] | undefined {
  if (input.extraImageUrls == null) return undefined;
  if (!Array.isArray(input.extraImageUrls)) throw new Error('extraImageUrls must be a list.');
  const cover = input.imageUrl?.trim();
  const urls: string[] = [];
  for (const raw of input.extraImageUrls) {
    if (typeof raw !== 'string') throw new Error('Each extra photo must be a link.');
    const url = raw.trim();
    if (!url || url === cover || urls.includes(url)) continue;
    if (!/^https?:\/\//i.test(url)) throw new Error('Each extra photo must be an uploaded image link.');
    urls.push(url);
  }
  if (urls.length > MAX_EXTRA_IMAGES) throw new Error(`Up to ${MAX_EXTRA_IMAGES} extra photos per product.`);
  if (urls.length > 0 && !cover) throw new Error('Add a main photo before extra photos.');
  return urls;
}

// Cut sizes and bulk orders are for chicken, which lives in this category.
export const CUT_OPTIONS_CATEGORY = 'Meat, Eggs & Fish';
export const MAX_BULK_MIN_KG = 500;

// Matches products_bulk_min_kg_check (backend migration 20261104130000).
// Undefined leaves both columns untouched; turning cuts off clears the
// bulk threshold too, since bulk handling hangs off the same toggle.
export function toCutOptions(input: Pick<ProductWriteInput, 'category' | 'cutOptionsEnabled' | 'bulkMinKg'>):
  { cut_options_enabled: boolean; bulk_min_kg: number | null } | undefined {
  if (input.cutOptionsEnabled == null) return undefined;
  if (typeof input.cutOptionsEnabled !== 'boolean') throw new Error('cutOptionsEnabled must be true or false.');
  // Moving a product out of the category switches it off with it (the form
  // hides the toggle there, so it cannot be switched off by hand).
  if (!input.cutOptionsEnabled || input.category?.trim() !== CUT_OPTIONS_CATEGORY) return { cut_options_enabled: false, bulk_min_kg: null };
  const kg = input.bulkMinKg;
  if (kg != null && (!isFiniteNumber(kg) || kg <= 0 || kg > MAX_BULK_MIN_KG)) {
    throw new Error(`Bulk order from (kg) must be more than 0 and at most ${MAX_BULK_MIN_KG}.`);
  }
  return { cut_options_enabled: true, bulk_min_kg: kg == null ? null : Math.round(kg * 100) / 100 };
}

export function formatVariantUnit(variant: VariantInput): string {
  const qty = Number.isInteger(variant.quantity) ? variant.quantity : variant.quantity.toFixed(2).replace(/\.?0+$/, '');
  const unitLabel: Record<UnitType, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };
  return `${qty} ${unitLabel[variant.unitType]}`;
}

function resolveOriginalPrice(price: number, originalPrice: number | null | undefined): number | null {
  return originalPrice != null && originalPrice > price ? originalPrice : null;
}

export interface ProductRow {
  store_id: string;
  name: string;
  unit: string;
  price: number;
  original_price: number | null;
  category: string;
  stock_status: StockStatus;
  image_url: string | null;
  bg_color: string;
  local_name: string | null;
  is_veg: boolean;
  freshness_tag: string | null;
  description: string | null;
  sub_category_id: string | null;
}

// Fallback chain steps 4-5 (1-3 — LightVibrant/Vibrant/Muted swatch
// extraction — already ran once at upload time, see lib/bgColor.ts's own
// note on the full chain and why it doesn't re-run here): a category tint
// when the photo yielded no usable color, then the neutral mist as the
// last resort. Runs here, not per-route, so POST and PATCH can't drift
// into picking a background two different ways for the same product.
function resolveBgColor(bgColor: string | null | undefined, category: string): string {
  return bgColor || CATEGORY_TINT_MAP[category] || MIST_FALLBACK;
}

export function toProductRow(input: ProductWriteInput): ProductRow {
  const defaultVariant = input.variants[0];
  if (!defaultVariant) throw new Error('At least one size is required.');

  return {
    store_id: input.storeId,
    name: input.name.trim(),
    unit: formatVariantUnit(defaultVariant),
    price: defaultVariant.price,
    original_price: resolveOriginalPrice(defaultVariant.price, defaultVariant.originalPrice),
    category: input.category.trim(),
    stock_status: input.stockStatus,
    image_url: input.imageUrl?.trim() || null,
    bg_color: resolveBgColor(input.bgColor, input.category),
    local_name: input.localName?.trim() || null,
    is_veg: input.isVeg ?? true,
    freshness_tag: input.freshnessTag?.trim() || null,
    description: input.description?.trim() || null,
    sub_category_id: input.subCategoryId || null,
  };
}

// One pack as save_catalogue_product expects it. variants[0] is the default
// pack (the RPC sets is_default by position); stock_quantity is only sent
// when a count was entered, so an edit never wipes a pack's counted stock.
export interface VariantPayload {
  id?: string;
  unit_type: UnitType;
  quantity: number;
  price: number;
  original_price: number | null;
  stock_quantity?: number;
}

export function toVariantPayload(variants: VariantInput[]): VariantPayload[] {
  return variants.map((variant) => {
    const payload: VariantPayload = {
      unit_type: variant.unitType,
      quantity: variant.quantity,
      price: variant.price,
      original_price: resolveOriginalPrice(variant.price, variant.originalPrice),
    };
    if (variant.id) payload.id = variant.id;
    if (variant.stockQuantity != null) payload.stock_quantity = variant.stockQuantity;
    return payload;
  });
}

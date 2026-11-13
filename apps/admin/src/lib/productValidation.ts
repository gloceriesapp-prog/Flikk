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
// Admin additionally resolves a blank store price from MRP before saving;
// the backend still validates its partner inputs independently.

import { CATEGORY_TINT_MAP, MIST_FALLBACK, categoryAllowsCutOptions, type UnitType } from './product-options';

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
  // Gloceries' extra (rupees) on top of the store price. Absent keeps it.
  platformMarkup?: number | null;
}

export interface ProductWriteInput {
  storeId: string;
  name: string;
  category: string;
  stockStatus: StockStatus;
  imageUrl?: string | null;
  // Flavours (product_options). Absent leaves them unchanged; a list replaces them.
  options?: { id?: string | null; name: string; imageUrl?: string | null; extraImageUrls?: string[] | null; priceOverrides?: Record<string, { price: number; originalPrice?: number }>; isAvailable?: boolean }[] | null;
  // Gallery photos after the cover (products.extra_image_urls). Absent leaves
  // the saved list alone; an array replaces it.
  extraImageUrls?: string[] | null;
  // Chicken cut sizes + bulk threshold (kg). Absent leaves them unchanged.
  cutOptionsEnabled?: boolean | null;
  bulkMinKg?: number | null;
  // No commission on this product. Absent leaves it unchanged.
  waiveCommission?: boolean | null;
  // Price per kg / L / piece on the card. Absent leaves it unchanged.
  showUnitPrice?: boolean | null;
  // Chilled / room temperature offered. Absent leaves it unchanged.
  servingOptions?: string[] | null;
  // Pre-order only + its bulk minimum and days of notice. Absent leaves them unchanged.
  preorderEnabled?: boolean | null;
  preorderMinQty?: number | null;
  preorderLeadDays?: number | null;
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
  // Absent leaves the brand unchanged; null clears it.
  brandId?: string | null;
  // The master item this product was added from (catalogue_items).
  catalogueItemId?: string | null;
  variants: VariantInput[];
}

const UNIT_TYPES: UnitType[] = ['g', 'kg', 'ml', 'l', 'pc'];
const STOCK_STATUSES: StockStatus[] = ['in_stock', 'low_stock', 'out_of_stock'];

// Matches product_variants_platform_markup_check (backend migration
// 20261104160000).
export const MAX_PLATFORM_MARKUP = 100000;

// What the customer pays for a pack: store price + our extra, never above
// MRP and never below the store price. Copy of backend/src/lib/
// customerPrice.ts customerUnitPrice (and the database's customer_unit_price).
export function customerUnitPrice(storePrice: number, markup: number | null | undefined, mrp: number | null | undefined): number {
  const withMarkup = Math.round((storePrice + Math.max(Number(markup ?? 0), 0)) * 100) / 100;
  if (mrp == null || !(Number(mrp) > 0)) return withMarkup;
  return Math.max(storePrice, Math.min(withMarkup, Number(mrp)));
}

// Each pack's extra, matched by size (unit type + quantity are unique per
// product, validateProductInput). Packs without a value are left alone.
export function toVariantMarkups(variants: VariantInput[]): { unit_type: UnitType; quantity: number; platform_markup: number }[] {
  return variants
    .filter((v) => v.platformMarkup != null)
    .map((v) => ({ unit_type: v.unitType, quantity: v.quantity, platform_markup: Math.round(Number(v.platformMarkup) * 100) / 100 }));
}

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
    if (!(sellingPrice(variant.price, variant.originalPrice) > 0)) {
      throw new Error(`${label}: enter a store price or MRP of at least ₹0.01.`);
    }
    if (variant.stockQuantity != null && (!Number.isSafeInteger(variant.stockQuantity) || variant.stockQuantity < 0)) {
      throw new Error(`${label}: stock must be a whole number, 0 or more.`);
    }
    if (variant.platformMarkup != null && (!isFiniteNumber(variant.platformMarkup) || variant.platformMarkup < 0 || variant.platformMarkup > MAX_PLATFORM_MARKUP)) {
      throw new Error(`${label}: our extra must be ₹0 to ₹${MAX_PLATFORM_MARKUP}.`);
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
    if (url.length > 2048 || !/^https?:\/\//i.test(url)) throw new Error('Each extra photo must be an uploaded image link.');
    urls.push(url);
  }
  if (urls.length > MAX_EXTRA_IMAGES) throw new Error(`Up to ${MAX_EXTRA_IMAGES} extra photos per product.`);
  if (urls.length > 0 && !cover) throw new Error('Add a main photo before extra photos.');
  return urls;
}

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
  if (!input.cutOptionsEnabled || !categoryAllowsCutOptions(input.category)) return { cut_options_enabled: false, bulk_min_kg: null };
  const kg = input.bulkMinKg;
  if (kg != null && (!isFiniteNumber(kg) || kg <= 0 || kg > MAX_BULK_MIN_KG)) {
    throw new Error(`Bulk order from (kg) must be more than 0 and at most ${MAX_BULK_MIN_KG}.`);
  }
  return { cut_options_enabled: true, bulk_min_kg: kg == null ? null : Math.round(kg * 100) / 100 };
}

export const MAX_PRODUCT_OPTIONS = 20;

// The flavour list to save, or undefined to leave it untouched. Names are
// trimmed, required, at most 60 characters and unique per product (matches
// product_options' checks); blank rows from the form are an error, not dropped.
export function toProductOptions(input: Pick<ProductWriteInput, 'options'>):
  { id: string | null; name: string; image_url: string | null; extra_image_urls?: string[]; price_overrides?: Record<string, { price: number; original_price?: number }>; is_available: boolean; sort_order: number }[] | undefined {
  if (input.options == null) return undefined;
  if (!Array.isArray(input.options)) throw new Error('options must be a list.');
  if (input.options.length > MAX_PRODUCT_OPTIONS) throw new Error(`Up to ${MAX_PRODUCT_OPTIONS} flavours per product.`);
  const seen = new Set<string>();
  return input.options.map((option, index) => {
    const name = typeof option?.name === 'string' ? option.name.trim() : '';
    if (!name) throw new Error(`Flavour ${index + 1}: enter a name.`);
    if (name.length > 60) throw new Error(`Flavour ${index + 1}: name is too long (60 characters max).`);
    if (seen.has(name.toLowerCase())) throw new Error(`Flavour "${name}" is listed twice.`);
    seen.add(name.toLowerCase());
    const image = option.imageUrl?.trim() || null;
    if (image && !/^https?:\/\//i.test(image)) throw new Error(`Flavour "${name}": upload the photo again.`);
    const extras = toExtraImageUrls(option);
    let prices: Record<string, { price: number; original_price?: number }> | undefined;
    if (option.priceOverrides !== undefined) {
      if (!option.priceOverrides || typeof option.priceOverrides !== 'object' || Array.isArray(option.priceOverrides) || Object.keys(option.priceOverrides).length > 32) throw new Error(`Flavour "${name}": invalid pack prices.`);
      prices = {};
      for (const [pack, value] of Object.entries(option.priceOverrides)) {
        if (!/^(base|(g|kg|ml|l|pc):[0-9]+(\.[0-9]+)?)$/.test(pack) || (pack !== 'base' && !(Number(pack.split(':')[1]) > 0))) throw new Error(`Flavour "${name}": invalid pack.`);
        if (!value || !Number.isFinite(value.price) || value.price <= 0 || value.price > 1000000 || Math.abs(value.price * 100 - Math.round(value.price * 100)) > 0.000001) throw new Error(`Flavour "${name}": enter a positive price with up to 2 decimal places.`);
        if (value.originalPrice !== undefined && (!Number.isFinite(value.originalPrice) || value.originalPrice < value.price || value.originalPrice > 1000000 || Math.abs(value.originalPrice * 100 - Math.round(value.originalPrice * 100)) > 0.000001)) throw new Error(`Flavour "${name}": MRP must be at least the store price.`);
        prices[pack] = { price: value.price, ...(value.originalPrice === undefined ? {} : { original_price: value.originalPrice }) };
      }
    }
    return { id: option.id ?? null, name, image_url: image, ...(extras === undefined ? {} : { extra_image_urls: extras }), ...(prices === undefined ? {} : { price_overrides: prices }), is_available: option.isAvailable !== false, sort_order: index };
  });
}

export function toCommissionWaiver(input: Pick<ProductWriteInput, 'waiveCommission'>): { waive_commission: boolean } | undefined {
  if (input.waiveCommission == null) return undefined;
  if (typeof input.waiveCommission !== 'boolean') throw new Error('waiveCommission must be true or false.');
  return { waive_commission: input.waiveCommission };
}

export function toUnitPriceFlag(input: Pick<ProductWriteInput, 'showUnitPrice'>): { show_unit_price: boolean } | undefined {
  if (input.showUnitPrice == null) return undefined;
  if (typeof input.showUnitPrice !== 'boolean') throw new Error('showUnitPrice must be true or false.');
  return { show_unit_price: input.showUnitPrice };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toBrand(input: Pick<ProductWriteInput, 'brandId'>): { brand_id: string | null } | undefined {
  if (input.brandId === undefined) return undefined;
  if (input.brandId === null || input.brandId === '') return { brand_id: null };
  if (typeof input.brandId !== 'string' || !UUID_RE.test(input.brandId)) throw new Error('Pick a brand from the list.');
  return { brand_id: input.brandId };
}

// Pre-order is opt-in. Off: only the flag is saved and the minimum / notice
// fields are ignored, so a normal product is never blocked by them. On: the
// limits match the database (products_preorder_limits): minimum 1–999 packs,
// notice 0 (same day) to 4 days.
export const PREORDER_MAX_LEAD_DAYS = 4;

export function toCatalogueItemLink(input: Pick<ProductWriteInput, 'catalogueItemId'>): { catalogue_item_id: string | null } | undefined {
  if (input.catalogueItemId === undefined) return undefined;
  if (input.catalogueItemId === null || input.catalogueItemId === '') return { catalogue_item_id: null };
  if (typeof input.catalogueItemId !== 'string' || !UUID_RE.test(input.catalogueItemId)) throw new Error('Pick the item from the suggestions.');
  return { catalogue_item_id: input.catalogueItemId };
}

export function toPreorder(input: Pick<ProductWriteInput, 'preorderEnabled' | 'preorderMinQty' | 'preorderLeadDays'>):
  { preorder_enabled: boolean; preorder_min_qty?: number; preorder_lead_days?: number } | undefined {
  if (input.preorderEnabled == null) return undefined;
  if (typeof input.preorderEnabled !== 'boolean') throw new Error('preorderEnabled must be true or false.');
  if (!input.preorderEnabled) return { preorder_enabled: false };
  const minQty = input.preorderMinQty ?? 1;
  const leadDays = input.preorderLeadDays ?? 0;
  if (!Number.isInteger(minQty) || minQty < 1 || minQty > 999) throw new Error('Pre-order minimum must be a whole number from 1 to 999.');
  if (!Number.isInteger(leadDays) || leadDays < 0 || leadDays > PREORDER_MAX_LEAD_DAYS) {
    throw new Error(`Pre-order notice must be same day to ${PREORDER_MAX_LEAD_DAYS} days.`);
  }
  return { preorder_enabled: true, preorder_min_qty: minQty, preorder_lead_days: leadDays };
}

const SERVING_VALUES = ['chilled', 'room_temperature'];

// Kept in a fixed order (chilled first) so the customer app shows them the
// same way every time; repeats dropped, unknown values rejected.
export function toServingOptions(input: Pick<ProductWriteInput, 'servingOptions'>): { serving_options: string[] } | undefined {
  if (input.servingOptions == null) return undefined;
  if (!Array.isArray(input.servingOptions) || input.servingOptions.some((v) => !SERVING_VALUES.includes(v))) {
    throw new Error('Serving must be chilled and/or room temperature.');
  }
  return { serving_options: SERVING_VALUES.filter((v) => input.servingOptions!.includes(v)) };
}

export function formatVariantUnit(variant: VariantInput): string {
  const qty = Number.isInteger(variant.quantity) ? variant.quantity : variant.quantity.toFixed(2).replace(/\.?0+$/, '');
  const unitLabel: Record<UnitType, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };
  return `${qty} ${unitLabel[variant.unitType]}`;
}

// A blank numeric store-price input is represented by 0. Resolve it before
// the product and every pack reach the database's positive-price constraint.
export function sellingPrice(price: number, originalPrice: number | null | undefined): number {
  const resolved = price > 0 ? price : (originalPrice ?? 0);
  return Math.round(resolved * 100) / 100;
}

function resolveOriginalPrice(price: number, originalPrice: number | null | undefined): number | null {
  const selling = sellingPrice(price, originalPrice);
  // Keep equal MRP too: it caps platform markup even without a discount.
  return originalPrice != null && originalPrice > 0 && originalPrice >= selling ? originalPrice : null;
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
    price: sellingPrice(defaultVariant.price, defaultVariant.originalPrice),
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
      price: sellingPrice(variant.price, variant.originalPrice),
      original_price: resolveOriginalPrice(variant.price, variant.originalPrice),
    };
    if (variant.id) payload.id = variant.id;
    if (variant.stockQuantity != null) payload.stock_quantity = variant.stockQuantity;
    return payload;
  });
}

// Shared mapping from the backend's real product+variant+store rows
// (routes/stores.ts: /stores/products/deals, /stores/products/catalog,
// /stores/products/similar — same products.product_variants rows a founder
// writes via admin's Inventory screen, same stores row a founder writes via
// admin's Add Store form) to this app's own Product shape (screens/home/
// products/types.ts). One place so every product feed (Today's Steal
// Deals, Today's Stock, ProductDetailSheet's "you may also like", and
// whatever's added next) stays in sync instead of each hook inventing its
// own row->Product mapping. Not moved into packages/shared — only this app
// consumes it right now; extract there if/when apps/partner needs the same
// mapping (no premature sharing).

import type { Product } from '../screens/home/products/types';
import { getPerUnitPriceLabel } from '../utils/perUnitPrice';
import { SERVINGS } from '../store/cartIdentity';

export interface ApiVariant {
  id: string;
  unit_type: 'g' | 'kg' | 'ml' | 'l' | 'pc';
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
  stock_quantity?: number | null;
}

export interface ApiProduct {
  matched_option_id?: string | null;
  is_in_stock?: boolean;
  stock_status?: string;
  approval_status?: string;
  stock_quantity?: number | null;
  stock_tracking_enabled?: boolean;
  id: string;
  name: string;
  unit?: string;
  local_name: string | null;
  category: string;
  sub_category_id?: string | null;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  // Optional: older cached rows and feeds from before the column existed.
  extra_image_urls?: string[] | null;
  bg_color: string | null;
  cut_options_enabled?: boolean | null;
  bulk_min_kg?: number | string | null;
  show_unit_price?: boolean | null;
  // Flavours; absent on feeds from before they existed.
  product_options?: { stock_quantity?: number | null; customer_prices?: Record<string, {price: number; original_price?: number | null}>; id: string; name: string; image_url: string | null; extra_image_urls?: string[] | null; sort_order: number; is_available: boolean }[] | null;
  // 'chilled' / 'room_temperature'; absent on feeds from before it existed.
  serving_options?: string[] | null;
  // Pre-order only (Home Pre-orders section); absent on older feeds.
  preorder_enabled?: boolean | null;
  preorder_min_qty?: number | null;
  preorder_lead_days?: number | null;
  is_veg: boolean;
  freshness_tag: string | null;
  product_variants: ApiVariant[];
  // Real FK, present on every row regardless of the stores join below —
  // what mapApiProduct's own storeId comes from (see that field's note in
  // types.ts).
  store_id: string;
  // Only present on feeds that join stores (all of routes/stores.ts's
  // product feeds do) — fssai_number/address_line/city are what
  // SellerDetailsCard needs, real columns a founder fills in on admin's Add
  // Store form (storeValidation.ts), not invented for this feed.
  stores: {
    is_active?: boolean;
    open_time?: string | null;
    close_time?: string | null;
    availability_override?: boolean | null;
    availability_override_until?: string | null;
    name: string;
    fssai_number: string | null;
    address_line: string | null;
    city: string | null;
    photo_url: string | null;
  } | null;
}

const UNIT_LABEL: Record<ApiVariant['unit_type'], string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };

function formatVariant(variant: ApiVariant): string {
  return `${variant.quantity} ${UNIT_LABEL[variant.unit_type]}`;
}

// Unconfirmed legacy inventory is different from confirmed depletion.
// Match backend eligibility; never invent a count or enable untracked stock.
function inventoryIssue(row: ApiProduct, variant?: ApiVariant): Product['unavailableReason'] {
  if (row.approval_status != null && row.approval_status !== 'approved') return 'product_unavailable';
  if (row.is_in_stock === false || row.stock_status === 'out_of_stock') return 'out_of_stock';
  if (row.stock_tracking_enabled === false || (row.stock_tracking_enabled && row.stock_quantity == null)) return 'stock_unconfirmed';
  if (row.stock_tracking_enabled && row.stock_quantity! <= 0) return 'out_of_stock';
  if (variant?.stock_quantity === 0) return 'out_of_stock';
  if (variant && row.product_variants.length > 1 && variant.stock_quantity == null) return 'stock_unconfirmed';
  return undefined;
}

// Cover first, then the gallery; blanks and repeats dropped. No cover means
// no photos at all (the card shows the placeholder), matching admin's rule.
function productImages(row: Pick<ApiProduct, 'image_url' | 'extra_image_urls'>): string[] {
  if (!row.image_url) return [];
  return [...new Set([row.image_url, ...(row.extra_image_urls ?? [])].filter(Boolean))];
}

// Only database variants are purchasable; no inferred pack sizes or prices.
export function mapApiProduct(row: ApiProduct): Product {
  const variants = [...row.product_variants].sort((a, b) => Number(b.is_default) - Number(a.is_default));
  const defaultVariant = variants.find(v => v.stock_quantity !== 0 && !(variants.length > 1 && v.stock_quantity == null)) ?? variants[0];
  const store = row.stores;
  const unavailableReason = inventoryIssue(row, defaultVariant);
  const unitPrice = (v: ApiVariant | undefined) => (row.show_unit_price && v ? getPerUnitPriceLabel(v.unit_type, Number(v.quantity), Number(v.price)) ?? undefined : undefined);

  return {
    storeOpening: store ? { isActive: store.is_active !== false, openTime: store.open_time, closeTime: store.close_time, availabilityOverride: store.availability_override, availabilityOverrideUntil: store.availability_override_until } : undefined,
    totalAvailableQuantity: row.stock_tracking_enabled ? row.stock_quantity ?? undefined : undefined,
    availableQuantity: defaultVariant?.stock_quantity ?? (row.stock_tracking_enabled ? row.stock_quantity : undefined) ?? undefined,
    id: row.id,
    name: row.name,
    localName: row.local_name ?? '',
    weight: defaultVariant ? formatVariant(defaultVariant) : (row.unit ?? ''),
    price: defaultVariant?.price ?? row.price,
    originalPrice: (defaultVariant ? defaultVariant.original_price : row.original_price) ?? undefined,
    defaultVariantId: defaultVariant?.id,
    unitPriceLabel: unitPrice(defaultVariant),
    // Not tracked on real products yet — no rating system exists
    // (CLAUDE.md's own out-of-scope list has no room for one either), so
    // these stay unused placeholders; ProductCardView never renders them.
    rating: 0,
    ratingCount: '',
    isAvailable: unavailableReason === undefined,
    unavailableReason,
    imageSeed: row.id,
    initialOptionId: row.matched_option_id ?? undefined,
    imageUrl: row.image_url ?? undefined,
    imageUrls: productImages(row),
    options: row.product_options?.length
      ? [...row.product_options].sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({ id: o.id, name: o.name, imageUrl: o.image_url ?? undefined, imageUrls: productImages(o), isAvailable: o.is_available && o.stock_quantity !== 0, availableQuantity: o.stock_quantity ?? undefined, prices: o.customer_prices ? Object.fromEntries(Object.entries(o.customer_prices).map(([key, value]) => [key, { price: value.price, originalPrice: value.original_price ?? undefined, unitPriceLabel: unitPrice(variants.find(v => v.id === key) ? { ...variants.find(v => v.id === key)!, price: value.price } : undefined) }])) : undefined }))
      : undefined,
    servingOptions: SERVINGS.filter((s) => row.serving_options?.includes(s)),
    preorder: row.preorder_enabled ? { minQty: Math.max(1, Number(row.preorder_min_qty ?? 1)), leadDays: Math.max(0, Number(row.preorder_lead_days ?? 0)) } : undefined,
    bgColor: row.bg_color ?? undefined,
    cutOptions: row.cut_options_enabled === true || undefined,
    bulkMinKg: row.cut_options_enabled && row.bulk_min_kg != null && Number(row.bulk_min_kg) > 0 ? Number(row.bulk_min_kg) : undefined,
    isVeg: row.is_veg,
    freshnessTag: row.freshness_tag ?? undefined,
    sizeOptions: variants.length > 0 ? variants.map(formatVariant) : undefined,
    // Only set when there's genuinely more than one real size to choose
    // between — ProductVariantOptions.tsx's own guard also checks this,
    // but not setting it here at all keeps a single-variant product's
    // Product object identical to how it looked before this field existed.
    variants:
      variants.length > 1
        ? variants.map((v) => ({ availableQuantity: v.stock_quantity ?? (row.stock_tracking_enabled ? row.stock_quantity ?? undefined : undefined), isAvailable: inventoryIssue(row, v) === undefined, unavailableReason: inventoryIssue(row, v), id: v.id, label: formatVariant(v), price: v.price, originalPrice: v.original_price ?? undefined, unitPriceLabel: unitPrice(v) }))
        : undefined,
    description: row.description ?? undefined,
    categoryLabel: row.category,
    storeId: row.store_id,
    storeName: store?.name,
    storePhotoUrl: store?.photo_url ?? undefined,
    // Only set when the store actually has an FSSAI number on file —
    // SellerDetailsCard's own guard (ProductDetailInfo.tsx) hides the whole
    // card rather than show a seller row with blank regulatory fields.
    sellerDetails:
      store?.fssai_number && store.name
        ? {
            name: store.name,
            fssaiNumber: store.fssai_number,
            address: [store.address_line, store.city].filter(Boolean).join(', '),
          }
        : undefined,
  };
}

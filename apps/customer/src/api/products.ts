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
  bg_color: string | null;
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

// Only database variants are purchasable; no inferred pack sizes or prices.
export function mapApiProduct(row: ApiProduct): Product {
  const variants = [...row.product_variants].sort((a, b) => Number(b.is_default) - Number(a.is_default));
  const defaultVariant = variants.find(v => v.stock_quantity !== 0 && !(variants.length > 1 && v.stock_quantity == null)) ?? variants[0];
  const store = row.stores;
  const unavailableReason = inventoryIssue(row, defaultVariant);

  return {
    storeOpening: store ? { isActive: store.is_active !== false, openTime: store.open_time, closeTime: store.close_time } : undefined,
    availableQuantity: defaultVariant?.stock_quantity ?? (row.stock_tracking_enabled ? row.stock_quantity : undefined) ?? undefined,
    id: row.id,
    name: row.name,
    localName: row.local_name ?? '',
    weight: defaultVariant ? formatVariant(defaultVariant) : (row.unit ?? ''),
    price: defaultVariant?.price ?? row.price,
    originalPrice: (defaultVariant ? defaultVariant.original_price : row.original_price) ?? undefined,
    defaultVariantId: defaultVariant?.id,
    // Not tracked on real products yet — no rating system exists
    // (CLAUDE.md's own out-of-scope list has no room for one either), so
    // these stay unused placeholders; ProductCardView never renders them.
    rating: 0,
    ratingCount: '',
    isAvailable: unavailableReason === undefined,
    unavailableReason,
    imageSeed: row.id,
    imageUrl: row.image_url ?? undefined,
    bgColor: row.bg_color ?? undefined,
    isVeg: row.is_veg,
    freshnessTag: row.freshness_tag ?? undefined,
    sizeOptions: variants.length > 0 ? variants.map(formatVariant) : undefined,
    // Only set when there's genuinely more than one real size to choose
    // between — ProductVariantOptions.tsx's own guard also checks this,
    // but not setting it here at all keeps a single-variant product's
    // Product object identical to how it looked before this field existed.
    variants:
      variants.length > 1
        ? variants.map((v) => ({ isAvailable: inventoryIssue(row, v) === undefined, unavailableReason: inventoryIssue(row, v), id: v.id, label: formatVariant(v), price: v.price, originalPrice: v.original_price ?? undefined }))
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

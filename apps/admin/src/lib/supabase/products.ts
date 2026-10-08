// Maps between the real public.products (+ product_variants, + joined store
// name/district) and this dashboard's own Product type (lib/types.ts), plus
// the two client-side reads Inventory needs (fetchProducts,
// fetchStoreOptions). Both go through admin-checked server routes
// (GET /api/products, GET /api/stores) that read with the service role —
// the browser anon client is RLS-limited to approved products of active
// stores, so pending products came back without their real sizes (and a
// save then replaced them) and inactive stores read as "Unknown store".
// Writes live in app/api/products/* too, see lib/supabase/admin.ts's note.

import type { Product, ProductVariant, StockStatus, Store } from '../types';
import type { UnitType } from '../product-options';

interface ProductVariantRow {
  id: string;
  unit_type: UnitType;
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
  stock_quantity: number | null;
}

export interface ProductRow {
  id: string;
  store_id: string;
  name: string;
  unit: string;
  price: number;
  original_price: number | null;
  category: string;
  stock_status: StockStatus;
  image_url: string | null;
  bg_color: string | null;
  local_name: string | null;
  is_veg: boolean;
  freshness_tag: string | null;
  description: string | null;
  sub_category_id: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  // A partner-submitted photo awaiting founder review — the product stays
  // live on its OLD image_url until admin approves/rejects this via
  // app/api/products/[id]/image-review. Null = nothing pending.
  pending_image_url: string | null;
  stock_quantity: number | null;
  stock_tracking_enabled: boolean;
  stores: { name: string; district: string } | null;
  product_variants: ProductVariantRow[];
}

export const PRODUCT_SELECT =
  'id, store_id, name, unit, price, original_price, category, stock_status, image_url, bg_color, local_name, is_veg, freshness_tag, description, sub_category_id, approval_status, pending_image_url, stock_quantity, stock_tracking_enabled, stores(name, district), product_variants(id, unit_type, quantity, price, original_price, is_default, stock_quantity)';

function mapVariants(rows: ProductVariantRow[], product: ProductRow): ProductVariant[] {
  // is_default first, then insertion order for the rest — mirrors how
  // toVariantPayload (lib/productValidation.ts) always sends index 0 as the
  // default, so a round-tripped product's size list comes back in the same
  // order a founder entered it.
  return [...rows]
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((row) => {
      // A single uncounted pack is tracked at product level (the rule
      // checkout uses), so show that count for it.
      const count = row.stock_quantity ?? (rows.length === 1 && product.stock_tracking_enabled ? product.stock_quantity : null);
      return {
        id: row.id,
        unitType: row.unit_type,
        quantity: Number(row.quantity),
        price: Number(row.price),
        originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
        stockQuantity: count ?? undefined,
      };
    });
}

// Only for a legacy product with no product_variants rows: rebuild its one
// size from the denormalized products.unit ("250 g", "1 L") so saving it
// writes that real size, not a made-up 1 g pack.
function fallbackVariant(row: ProductRow): ProductVariant {
  const match = /^(\d+(?:\.\d+)?)\s*(g|kg|ml|l|pc)$/i.exec(row.unit.trim());
  const unitType = (match?.[2]?.toLowerCase() ?? 'pc') as ProductVariant['unitType'];
  return {
    unitType,
    quantity: match ? Number(match[1]) : 1,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    stockQuantity: row.stock_tracking_enabled && row.stock_quantity != null ? row.stock_quantity : undefined,
  };
}

export function mapRowToProduct(row: ProductRow): Product {
  const variants = mapVariants(row.product_variants ?? [], row);

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    storeId: row.store_id,
    storeName: row.stores?.name ?? 'Unknown store',
    price: Number(row.price),
    originalPrice: row.original_price ? Number(row.original_price) : undefined,
    unit: row.unit,
    stockStatus: row.stock_status,
    imageUrl: row.image_url ?? undefined,
    bgColor: row.bg_color ?? undefined,
    localName: row.local_name ?? undefined,
    isVeg: row.is_veg,
    freshnessTag: row.freshness_tag ?? undefined,
    description: row.description ?? undefined,
    subCategoryId: row.sub_category_id ?? undefined,
    approvalStatus: row.approval_status,
    pendingImageUrl: row.pending_image_url,
    // Falls back to a single variant built from the product row's own
    // denormalized price/unit if product_variants is somehow empty (a
    // product written before this table existed) — Edit should never show
    // a product with zero sizes to edit.
    variants: variants.length > 0 ? variants : [fallbackVariant(row)],
    stockQuantity: row.stock_tracking_enabled ? row.stock_quantity : null,
  };
}

async function readJson<T>(path: string, failure: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? failure);
  return body as T;
}

export async function fetchProducts(): Promise<Product[]> {
  return readJson<Product[]>('/api/products', 'Could not load products.');
}

export interface StoreOption {
  id: string;
  name: string;
  district: string;
}

export async function fetchStoreOptions(): Promise<StoreOption[]> {
  const stores = await readJson<Store[]>('/api/stores', 'Could not load stores.');
  return stores.map((store) => ({ id: store.id, name: store.name, district: store.district }));
}

// Maps between the real public.products (+ product_variants, + joined store
// name/district) and this dashboard's own Product type (lib/types.ts), plus
// the two client-side reads Inventory needs (fetchProducts,
// fetchStoreOptions — both covered by public RLS read policies, no
// service-role key needed here). Writes live in app/api/products/* instead,
// see lib/supabase/admin.ts's own note on why.

import { supabase } from './client';
import type { Product, ProductVariant, StockStatus } from '../types';
import type { UnitType } from '../product-options';

interface ProductVariantRow {
  id: string;
  unit_type: UnitType;
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
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
  stores: { name: string; district: string } | null;
  product_variants: ProductVariantRow[];
}

export const PRODUCT_SELECT =
  'id, store_id, name, unit, price, original_price, category, stock_status, image_url, bg_color, local_name, is_veg, freshness_tag, description, sub_category_id, approval_status, pending_image_url, stores(name, district), product_variants(id, unit_type, quantity, price, original_price, is_default)';

function mapVariants(rows: ProductVariantRow[]): ProductVariant[] {
  // is_default first, then insertion order for the rest — mirrors how
  // toVariantPayload (lib/productValidation.ts) always sends index 0 as the
  // default, so a round-tripped product's size list comes back in the same
  // order a founder entered it.
  return [...rows]
    .sort((a, b) => Number(b.is_default) - Number(a.is_default))
    .map((row) => ({
      id: row.id,
      unitType: row.unit_type,
      quantity: Number(row.quantity),
      price: Number(row.price),
      originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    }));
}

export function mapRowToProduct(row: ProductRow): Product {
  const variants = mapVariants(row.product_variants ?? []);

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
    variants: variants.length > 0 ? variants : [{ unitType: 'g', quantity: 1, price: row.price }],
  };
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).order('name');
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(mapRowToProduct);
}

export interface StoreOption {
  id: string;
  name: string;
  district: string;
}

export async function fetchStoreOptions(): Promise<StoreOption[]> {
  const { data, error } = await supabase.from('stores').select('id, name, district').order('name');
  if (error) throw error;
  return data as StoreOption[];
}

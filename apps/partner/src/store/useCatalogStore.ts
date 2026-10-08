// Single source of truth for the product catalog — lifted out of
// screens/catalog/CatalogScreen.tsx's local useState so ProductDetailScreen
// (a real pushed screen now, not a bottom sheet — see that screen's own
// note on why) can read/act on the same products without passing whole
// product objects through navigation params. Same shape and reasoning as
// store/useOrdersStore.ts.
//
// Backed by real GET/POST /partner/products now (backend/src/routes/
// partner.ts). loadProducts() is called once from CatalogScreen's mount
// effect, same pattern as useStoreProfileStore's loadProfile(). A product
// this store owner adds always comes back approval_status: 'pending' —
// see partner.ts's own note — CatalogScreen/ProductRow show a badge for
// anything that isn't 'approved' yet.
//
// updateProduct/deleteProduct are backed by real PATCH/DELETE
// /partner/products/:id (backend/src/routes/partner.ts). Stock is counted
// per size (product_variants.stock_quantity): add/edit send each size's
// count, the backend saves packs in place (keeping counts it wasn't sent)
// and turns on stock tracking, which checkout requires. PATCH is partial —
// only name/stock/sizes are sent, so admin-set fields are never touched.

import { create } from 'zustand';
import { apiRequest } from '../api/client';
import { deleteProductApi, updateProductApi } from '../api/catalog';
import {
  isDuplicateProductName,
  summarizeVariants,
  toBackendVariant,
  type PartnerProduct,
  type ProductVariant,
} from '../screens/catalog/data';

interface VariantRow {
  id: string;
  unit_type: string;
  quantity: number;
  price: number;
  original_price: number | null;
  is_default: boolean;
  stock_quantity: number | null;
}

interface ProductRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  image_url: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  pending_changes?: Record<string, unknown> | null;
  stock_quantity: number | null;
  stock_tracking_enabled: boolean;
  product_variants: VariantRow[];
}

const UNIT_LABEL: Record<string, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };

function labelFor(row: VariantRow): string {
  return `${Number(row.quantity)} ${UNIT_LABEL[row.unit_type] ?? row.unit_type}`;
}

function fromRow(row: ProductRow): PartnerProduct {
  // Each size reads its own counted stock (set here or by admin); a size
  // never counted falls back to the product-level status.
  const isInStock = row.stock_status !== 'out_of_stock';
  const single = row.product_variants.length === 1;
  const variants: ProductVariant[] =
    row.product_variants.length > 0
      ? [...row.product_variants]
          .sort((a, b) => Number(b.is_default) - Number(a.is_default))
          .map((v) => {
            // A single uncounted pack is tracked at product level (same rule
            // checkout uses), so show that count for it.
            const count = v.stock_quantity ?? (single && row.stock_tracking_enabled ? row.stock_quantity : null);
            return {
              id: v.id,
              label: labelFor(v),
              price: Number(v.price),
              originalPrice: v.original_price != null ? Number(v.original_price) : undefined,
              stockQuantity: count ?? undefined,
              isInStock: count != null ? count > 0 : isInStock,
            };
          })
      : [{ id: 'default', label: row.unit, price: row.price, isInStock }];

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    price: row.price,
    isInStock,
    imageUrl: row.image_url,
    stockQuantity: row.stock_tracking_enabled ? row.stock_quantity : null,
    approvalStatus: row.approval_status,
    hasPendingChanges: row.pending_changes != null,
    variants,
  };
}

export interface AddProductInput {
  name: string;
  category: string;
  imageUrl?: string;
  variants: ProductVariant[];
}

interface CatalogState {
  products: PartnerProduct[];
  loaded: boolean;
  loadProducts: () => Promise<void>;
  // Throws (with a real message) on failure — ProductDetailScreen surfaces
  // it, same convention as addProduct below.
  // Resolves to the saved product (null if it was not in the list) so the
  // caller can tell the owner when a name/price edit went to review.
  updateProduct: (productId: string, name: string, variants: ProductVariant[]) => Promise<PartnerProduct | null>;
  // Throws PRODUCT_HAS_ORDERS (409, backend's own note) if this product has
  // ever been ordered — order_items.product_id can't be orphaned, so a
  // product with real order history can only be marked out of stock, not
  // deleted. ProductDetailScreen surfaces that message as-is.
  deleteProduct: (productId: string) => Promise<void>;
  // Throws (with a real message) on failure — the add-product screen
  // surfaces it, same convention as this app's other write calls.
  // Returns false without calling the backend when `name` is already
  // listed at this store.
  addProduct: (input: AddProductInput) => Promise<boolean>;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  loaded: false,

  loadProducts: async () => {
    try {
      const rows = await apiRequest<ProductRow[]>('/partner/products');
      set({ products: rows.map(fromRow), loaded: true });
    } catch {
      // Best-effort — a failed load just leaves the previous list on
      // screen, same tolerance as useStoreProfileStore's loadProfile.
    }
  },

  updateProduct: async (productId, name, variants) => {
    const existing = get().products.find((p) => p.id === productId);
    if (!existing) return null;

    const { isInStock } = summarizeVariants(variants);
    const row = await updateProductApi(productId, {
      name: name.trim(),
      stockStatus: isInStock ? 'in_stock' : 'out_of_stock',
      variants: variants.map(toBackendVariant),
    });
    const updated = fromRow(row as ProductRow);
    set((state) => ({ products: state.products.map((p) => (p.id === productId ? updated : p)) }));
    return updated;
  },

  deleteProduct: async (productId) => {
    await deleteProductApi(productId);
    set((state) => ({ products: state.products.filter((p) => p.id !== productId) }));
  },

  addProduct: async ({ name, category, imageUrl, variants }) => {
    if (isDuplicateProductName(get().products, name)) return false;

    const body = {
      name: name.trim(),
      category,
      imageUrl,
      stockStatus: summarizeVariants(variants).isInStock ? ('in_stock' as const) : ('out_of_stock' as const),
      variants: variants.map(toBackendVariant),
    };
    const row = await apiRequest<ProductRow>('/partner/products', { method: 'POST', body });
    set((state) => ({ products: [...state.products, fromRow(row)] }));
    return true;
  },
}));

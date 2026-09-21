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
// /partner/products/:id (backend/src/routes/partner.ts) — per-variant
// stock toggling still rolls up to the one product-level stock_status
// column (no per-size stock flag on product_variants), same rollup
// summarizeVariants below already does for the row-summary fields.

import { create } from 'zustand';
import { apiRequest } from '../api/client';
import { deleteProductApi, updateProductApi } from '../api/catalog';
import {
  isDuplicateProductName,
  parseVariantLabel,
  summarizeVariants,
  type PartnerProduct,
  type ProductVariant,
} from '../screens/catalog/data';

interface VariantRow {
  id: string;
  unit_type: string;
  quantity: number;
  price: number;
  is_default: boolean;
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
  product_variants: VariantRow[];
}

const UNIT_LABEL: Record<string, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'L', pc: 'pc' };

function labelFor(row: VariantRow): string {
  const qty = Number.isInteger(row.quantity) ? row.quantity : row.quantity;
  return `${qty} ${UNIT_LABEL[row.unit_type] ?? row.unit_type}`;
}

function fromRow(row: ProductRow): PartnerProduct {
  // No per-variant stock column on product_variants — every size of a
  // product shares the one product-level stock_status, see this file's own
  // note above.
  const isInStock = row.stock_status !== 'out_of_stock';
  const variants: ProductVariant[] =
    row.product_variants.length > 0
      ? row.product_variants.map((v) => ({ id: v.id, label: labelFor(v), price: v.price, isInStock }))
      : [{ id: 'default', label: row.unit, price: row.price, isInStock }];

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    price: row.price,
    isInStock,
    imageUrl: row.image_url,
    approvalStatus: row.approval_status,
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
  updateProduct: (productId: string, name: string, variants: ProductVariant[]) => Promise<void>;
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
    if (!existing) return;

    const { isInStock } = summarizeVariants(variants);
    const row = await updateProductApi(productId, {
      name: name.trim(),
      category: existing.category,
      imageUrl: existing.imageUrl,
      stockStatus: isInStock ? 'in_stock' : 'out_of_stock',
      variants: variants.map((v) => parseVariantLabel(v.label, v.price, v.originalPrice)),
    });
    const updated = fromRow(row as ProductRow);
    set((state) => ({ products: state.products.map((p) => (p.id === productId ? updated : p)) }));
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
      stockStatus: 'in_stock' as const,
      variants: variants.map((v) => parseVariantLabel(v.label, v.price, v.originalPrice)),
    };
    const row = await apiRequest<ProductRow>('/partner/products', { method: 'POST', body });
    set((state) => ({ products: [...state.products, fromRow(row)] }));
    return true;
  },
}));

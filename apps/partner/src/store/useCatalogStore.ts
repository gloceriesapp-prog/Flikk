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
// updateProduct stays local-only (no PATCH /partner/products/:id call) —
// per-variant stock toggling here has no column to write to
// (product_variants has no per-size stock flag, only the product-level
// stock_status this store's own fromRow collapses variants against on
// read) — editing an existing product's real persistence is a separate,
// not-yet-asked-for pass, tracked as a known gap rather than half-wired.

import { create } from 'zustand';
import { apiRequest } from '../api/client';
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
  updateProduct: (productId: string, name: string, variants: ProductVariant[]) => void;
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

  updateProduct: (productId, name, variants) =>
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? { ...product, name, variants, ...summarizeVariants(variants) } : product
      ),
    })),

  addProduct: async ({ name, category, imageUrl, variants }) => {
    if (isDuplicateProductName(get().products, name)) return false;

    const body = {
      name: name.trim(),
      category,
      imageUrl,
      stockStatus: 'in_stock' as const,
      variants: variants.map((v) => parseVariantLabel(v.label, v.price)),
    };
    const row = await apiRequest<ProductRow>('/partner/products', { method: 'POST', body });
    set((state) => ({ products: [...state.products, fromRow(row)] }));
    return true;
  },
}));

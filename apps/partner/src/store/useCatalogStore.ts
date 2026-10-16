// Bounded, account-isolated inventory pages. Refreshes coalesce and retain
// the last good page on failure; cursor reads only run on explicit load-more.

import { create } from 'zustand';
import { getSessionEpoch, isCurrentSession, onSessionReset } from './sessionScope';
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

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  image_url: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  pending_image_url?: string | null;
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
    hasPendingChanges: row.pending_changes != null || row.pending_image_url != null,
    variants,
  };
}

export interface AddProductInput {
  name: string;
  category: string;
  imageUrl?: string;
  variants: ProductVariant[];
}

type StockFilter = 'all' | 'in_stock' | 'out_of_stock';
interface CatalogState {
  products: PartnerProduct[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: number | null;
  nextCursor: string | null;
  search: string;
  stock: StockFilter;
  loadProducts: (force?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (search: string, stock: StockFilter) => Promise<void>;
  updateProduct: (productId: string, name: string, variants: ProductVariant[], edits?: { category: string; imageUrl: string | null }) => Promise<PartnerProduct | null>;
  deleteProduct: (productId: string) => Promise<void>;
  addProduct: (input: AddProductInput) => Promise<boolean>;
}
const empty = { products: [] as PartnerProduct[], loaded: false, loading: false, error: null as string | null, lastUpdatedAt: null as number | null, nextCursor: null as string | null, search: '', stock: 'all' as StockFilter };
let sequence = 0;
let inFlight: { key: string; request: number; promise: Promise<void> } | null = null;
let failures = 0;
let retryAt = 0;

export const useCatalogStore = create<CatalogState>((set, get) => {
  const read = (append: boolean, force = false): Promise<void> => {
    const state = get();
    if (append && !state.nextCursor) return Promise.resolve();
    const epoch = getSessionEpoch();
    const key = `${epoch}:${state.search}:${state.stock}:${append ? state.nextCursor : 'first'}`;
    if (inFlight?.key === key) return inFlight.promise;
    if (!force && !append && (Date.now() < retryAt || (state.lastUpdatedAt && Date.now() - state.lastUpdatedAt < 60_000))) return Promise.resolve();
    // Never overlap page reads and refreshes for the same selection.
    if (state.loading && inFlight) return inFlight.promise;
    const request = ++sequence;
    set({ loading: true, error: null });
    const params = new URLSearchParams({ page: '1', limit: '30', q: state.search, stock: state.stock });
    if (append && state.nextCursor) params.set('cursor', state.nextCursor);
    const promise = (async () => {
      try {
        const page = await apiRequest<{ items: ProductRow[]; nextCursor: string | null }>(`/partner/products?${params}`);
        if (!isCurrentSession(epoch) || request !== sequence) return;
        failures = 0; retryAt = 0;
        const items = page.items.map(fromRow);
        set((current) => ({ products: append ? [...current.products, ...items.filter((item) => !current.products.some((p) => p.id === item.id))] : items, loaded: true, nextCursor: page.nextCursor, lastUpdatedAt: Date.now(), error: null }));
      } catch {
        if (!isCurrentSession(epoch) || request !== sequence) return;
        failures += 1; retryAt = Date.now() + Math.min(300_000, 15_000 * 2 ** Math.min(failures, 5));
        set({ error: 'Could not refresh inventory. Your last loaded items are still shown.' });
      } finally {
        if (isCurrentSession(epoch) && request === sequence) set({ loading: false });
        if (inFlight?.request === request) inFlight = null;
      }
    })();
    inFlight = { key, request, promise };
    return promise;
  };
  return {
  ...empty,
  loadProducts: (force = false) => read(false, force),
  loadMore: () => read(true),
  setFilters: async (search, stock) => {
    if (get().search === search.trim() && get().stock === stock) return;
    sequence += 1; inFlight = null; retryAt = 0;
    set({ search: search.trim(), stock, products: [], loaded: false, loading: false, lastUpdatedAt: null, nextCursor: null, error: null });
    await read(false, true);
  },

  updateProduct: async (productId, name, variants, edits) => {
    const epoch = getSessionEpoch();
    const existing = get().products.find((p) => p.id === productId);
    if (!existing) return null;

    const { isInStock } = summarizeVariants(variants);
    const row = await updateProductApi(productId, {
      ...edits,
      name: name.trim(),
      stockStatus: isInStock ? 'in_stock' : 'out_of_stock',
      variants: variants.map(toBackendVariant),
    });
    if (!isCurrentSession(epoch)) throw new Error('Account changed. Please reopen inventory.');
    sequence += 1; inFlight = null;
    set({ loading: false });
    const updated = fromRow(row as ProductRow);
    set((state) => ({ products: state.products.map((p) => (p.id === productId ? updated : p)) }));
    return updated;
  },

  deleteProduct: async (productId) => {
    const epoch = getSessionEpoch();
    await deleteProductApi(productId);
    if (!isCurrentSession(epoch)) return;
    sequence += 1; inFlight = null; set({ loading: false });
    set((state) => ({ products: state.products.filter((p) => p.id !== productId) }));
  },

  addProduct: async ({ name, category, imageUrl, variants }) => {
    const epoch = getSessionEpoch();
    if (isDuplicateProductName(get().products, name)) return false;

    const body = {
      name: name.trim(),
      category,
      imageUrl,
      stockStatus: summarizeVariants(variants).isInStock ? ('in_stock' as const) : ('out_of_stock' as const),
      variants: variants.map(toBackendVariant),
    };
    const row = await apiRequest<ProductRow>('/partner/products', { method: 'POST', body });
    if (!isCurrentSession(epoch)) throw new Error('Account changed. Please reopen inventory.');
    sequence += 1; inFlight = null; set({ loading: false });
    set((state) => ({ products: [fromRow(row), ...state.products] }));
    return true;
  },
};
});

onSessionReset(() => { sequence += 1; inFlight = null; failures = 0; retryAt = 0; useCatalogStore.setState({ ...empty, products: [] }); });

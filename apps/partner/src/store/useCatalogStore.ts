// Single source of truth for the product catalog — lifted out of
// screens/catalog/CatalogScreen.tsx's local useState so ProductDetailScreen
// (a real pushed screen now, not a bottom sheet — see that screen's own
// note on why) can read/act on the same products without passing whole
// product objects through navigation params. Same shape and reasoning as
// store/useOrdersStore.ts.
//
// Still placeholder data underneath — no `GET /partner/products` call yet,
// same no-auth caveat as everywhere else in this app.

import { create } from 'zustand';
import { PLACEHOLDER_PRODUCTS, summarizeVariants, type PartnerProduct, type ProductVariant } from '../screens/catalog/data';

interface CatalogState {
  products: PartnerProduct[];
  updateProduct: (productId: string, name: string, variants: ProductVariant[]) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  products: PLACEHOLDER_PRODUCTS,

  updateProduct: (productId, name, variants) =>
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId ? { ...product, name, variants, ...summarizeVariants(variants) } : product
      ),
    })),
}));

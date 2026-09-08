// In-memory cart for the current session only — no persistence (POST
// /orders, called from CheckoutScreen, is what actually persists an order
// once checkout completes; the cart itself is just the pre-order draft).
// Every "ADD" button across the app (ProductCard, CategoryProductCard)
// calls addItem with the same shape, so the cart never needs to know which
// screen a product was added from.

import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  weight: string;
  price: number;
  quantity: number;
  // Display-only (CartItemRow's strikethrough) — never derive a charged
  // total from this, only ever from `price`, same rule as
  // order_items.unit_price_at_order per CLAUDE.md.
  originalPrice?: number;
  // Real products.store_id (Product.storeId, home/products/types.ts) —
  // what enforces "single-store-per-order" at add-to-cart time below, and
  // what POST /orders reads to know which store this order belongs to.
  storeId: string;
  // Real stores.name (Product.storeName) — CheckoutScreen's own order
  // summary card shows this so a customer sees which real store they're
  // paying, not just a delivery address with no seller context.
  storeName?: string;
  // Real products.image_url (Product.imageUrl) — what CartItemRow/CartBar
  // show instead of the shared PLACEHOLDER_IMAGE_URI stand-in. Undefined
  // for a product with no photo uploaded yet, same fallback-to-placeholder
  // convention every other real product image in this app already uses.
  imageUrl?: string;
}

// What a card passes in — quantity starts at 1 and is tracked by the store,
// not the caller.
export type CartProduct = Omit<CartItem, 'quantity'>;

// What addItem reports back so a caller can react — this store can't pop a
// confirm dialog itself (a synchronous zustand action, no way to await a
// tap), so a cross-store add is reported, not auto-resolved. Every ADD
// button's own onPress (see the 3 real call sites) checks this and shows
// an Alert "replace your cart?" before ever calling replaceCartWithItem.
export type AddItemResult = 'added' | 'store_conflict';

interface CartState {
  items: CartItem[];
  // Real store this cart currently belongs to — null once empty. Every add
  // is checked against it (see addItem's own note).
  storeId: string | null;
  addItem: (product: CartProduct) => AddItemResult;
  // Only ever called after a caller's own confirm dialog on a
  // 'store_conflict' result — clears whatever was in the cart and starts a
  // fresh one with just this product. Never called directly from a bare
  // ADD button tap.
  replaceCartWithItem: (product: CartProduct) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  storeId: null,

  addItem: (product) => {
    // A product with no real store id (any feed that hasn't been wired to
    // the real backend) can never be part of a real order. Refusing the
    // add outright, rather than letting '' through as if it were a real
    // store, keeps it from ever reaching the store-conflict check below
    // and corrupting a genuinely real cart.
    if (!product.storeId) return 'store_conflict';

    const state = get();
    // Single-store-per-order (CLAUDE.md's own scope note) — a product
    // from a different store than what's already in the cart can't just
    // be added (POST /orders would reject the mix anyway, validateCart's
    // own MULTI_STORE_CART check) and doesn't silently replace the cart
    // either anymore — that silently discarded whatever was already
    // there the instant a customer browsed a cross-store row like Home's
    // "Today's Stock" (real bug: adding Brinjal from Store A then Onion
    // from Store B looked like "I can only ever add one item"). The
    // caller shows a real confirm dialog instead and calls
    // replaceCartWithItem only if the customer actually agrees to start
    // over with a different store.
    if (state.storeId && state.storeId !== product.storeId) {
      return 'store_conflict';
    }

    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity: 1 }], storeId: product.storeId };
    });
    return 'added';
  },

  replaceCartWithItem: (product) => set({ items: [{ ...product, quantity: 1 }], storeId: product.storeId }),

  incrementItem: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
    })),

  decrementItem: (id) =>
    set((state) => {
      const items = state.items
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0);
      return { items, storeId: items.length > 0 ? state.storeId : null };
    }),

  removeItem: (id) =>
    set((state) => {
      const items = state.items.filter((item) => item.id !== id);
      return { items, storeId: items.length > 0 ? state.storeId : null };
    }),

  clear: () => set({ items: [], storeId: null }),
}));

export function selectCartTotalQuantity(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function selectCartTotalPrice(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Flat placeholder fees — no pricing-rules backend exists yet to compute
// real ones. Shared here (not duplicated per-screen) so CartScreen and
// CheckoutScreen can't quote two different totals for the same cart.
export const CART_DELIVERY_FEE = 25;
export const CART_HANDLING_FEE = 3;

// Real free-delivery threshold — BillDetailsCard and FreeDeliveryProgressCard
// both waive/show CART_DELIVERY_FEE off this same constant once itemTotal
// crosses it, so the two can't quote different thresholds.
export const FREE_DELIVERY_THRESHOLD = 199;

export function selectCartGrandTotal(state: CartState): number {
  return selectCartTotalPrice(state) + CART_DELIVERY_FEE + CART_HANDLING_FEE;
}

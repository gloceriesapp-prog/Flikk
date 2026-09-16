// In-memory cart for the current session only — no persistence (POST
// /orders or POST /trips, called from CheckoutScreen, is what actually
// persists an order once checkout completes; the cart itself is just the
// pre-order draft). Every "ADD" button across the app (ProductCard,
// CategoryProductCard) calls addItem with the same shape, so the cart
// never needs to know which screen a product was added from.
//
// Multi-store cart — items are grouped BY STORE (selectCartGroupedByStore
// below), not forced into a single store the way this used to work. Adding
// a product from Store B while Store A's items are already in the cart no
// longer conflicts or blocks; both sit in the cart as their own group.
// This mirrors the real checkout split: a cart touching only one store
// still checks out via POST /orders (backend/src/routes/orders.ts,
// unchanged), a cart spanning more than one store checks out as one
// "trip" via POST /trips (backend/src/routes/trips.ts) — one payment, one
// delivery fee, one real order per store under the hood. See
// backend/migrations/014_trips.sql's own note on why: a single rider does
// one multi-stop pickup instead of the customer being blocked from buying
// from two stores at once.

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
  // what groups this item into its own store's line at checkout, and what
  // POST /orders or POST /trips's own per-leg grouping reads to know which
  // store each item belongs to.
  storeId: string;
  // Real stores.name (Product.storeName) — CheckoutScreen's own per-store
  // group header shows this so a customer sees which real store they're
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

// A cart-level promo (api/promos.ts's own POST /promos/validate) — set
// once CartScreen's "Apply" succeeds. Cleared on any cart edit (add/
// remove/qty change) rather than kept stale: a code's min_order_value or
// percent-of-cart discount can stop making sense the instant the cart
// changes, and the backend re-validates from scratch at checkout anyway
// (routes/orders.ts's own note) — clearing here just keeps what's
// displayed honest in the meantime, it's not the actual enforcement.
export interface AppliedPromo {
  code: string;
  discountAmount: number;
}

interface CartState {
  items: CartItem[];
  appliedPromo: AppliedPromo | null;
  addItem: (product: CartProduct) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  setAppliedPromo: (promo: AppliedPromo | null) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  appliedPromo: null,

  addItem: (product) => {
    // A product with no real store id (any feed that hasn't been wired to
    // the real backend) can never be part of a real order — refusing the
    // add outright keeps it from ever reaching checkout, same guard this
    // store has always had, unrelated to the multi-store change above.
    if (!product.storeId) return;

    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
          appliedPromo: null,
        };
      }
      return { items: [...state.items, { ...product, quantity: 1 }], appliedPromo: null };
    });
  },

  incrementItem: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
      appliedPromo: null,
    })),

  decrementItem: (id) =>
    set((state) => ({
      items: state.items
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
      appliedPromo: null,
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      appliedPromo: null,
    })),

  setAppliedPromo: (promo) => set({ appliedPromo: promo }),

  clear: () => set({ items: [], appliedPromo: null }),
}));

export function selectCartTotalQuantity(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.quantity, 0);
}

export function selectCartTotalPrice(state: CartState): number {
  return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export interface CartStoreGroup {
  storeId: string;
  storeName?: string;
  items: CartItem[];
  itemTotal: number;
}

// Groups a flat item list into one section per store — CartScreen's own
// "From Store 1 / From Store 2" mini-sections read straight off this,
// instead of the cart pretending every item belongs to one store.
//
// A plain function of `items`, NOT a zustand selector (`(state: CartState)
// => ...`) — a selector re-runs on every store update and this one builds a
// brand-new array/objects each time, so its return value is never
// reference-equal to the previous call even when the cart hasn't actually
// changed. zustand v5's `useCartStore(selector)` compares snapshots via
// `useSyncExternalStore`, which requires a STABLE reference for "nothing
// changed" — a selector that always returns a new reference makes every
// render see a "changed" snapshot, which schedules another render, which
// calls the selector again... the exact "Maximum update depth exceeded" /
// "getSnapshot should be cached" crash CartScreen hit. Call sites now
// select the plain `items` array (already reference-stable — zustand only
// gives it a new reference on a real mutation) and memoize this
// computation themselves off of it (`useMemo(() =>
// groupCartItemsByStore(items), [items])`), so it only re-runs when the
// cart actually changes.
export function groupCartItemsByStore(items: CartItem[]): CartStoreGroup[] {
  const groups = new Map<string, CartStoreGroup>();
  for (const item of items) {
    let group = groups.get(item.storeId);
    if (!group) {
      group = { storeId: item.storeId, storeName: item.storeName, items: [], itemTotal: 0 };
      groups.set(item.storeId, group);
    }
    group.items.push(item);
    group.itemTotal += item.price * item.quantity;
  }
  return [...groups.values()];
}

// Whether this cart checks out via POST /orders (1 store) or POST /trips
// (>1 store) — CheckoutScreen's own call-site decision, kept here so it
// can't drift out of sync with how the cart actually groups items.
export function selectCartStoreCount(state: CartState): number {
  return new Set(state.items.map((item) => item.storeId)).size;
}

// Flat placeholder fees — no pricing-rules backend exists yet to compute
// real ones. Shared here (not duplicated per-screen) so CartScreen and
// CheckoutScreen can't quote two different totals for the same cart. Only
// ONE of these is ever charged per checkout regardless of how many stores
// are in the cart — same "one delivery fee per trip, not per store" rule
// backend/src/lib/trips.ts's own calcTripTotal enforces server-side.
export const CART_DELIVERY_FEE = 25;
export const CART_HANDLING_FEE = 3;

// Real free-delivery threshold — BillDetailsCard and FreeDeliveryProgressCard
// both waive/show CART_DELIVERY_FEE off this same constant once itemTotal
// crosses it, so the two can't quote different thresholds.
export const FREE_DELIVERY_THRESHOLD = 199;

export function selectCartGrandTotal(state: CartState): number {
  const discount = state.appliedPromo?.discountAmount ?? 0;
  return Math.max(selectCartTotalPrice(state) + CART_DELIVERY_FEE + CART_HANDLING_FEE - discount, 0);
}

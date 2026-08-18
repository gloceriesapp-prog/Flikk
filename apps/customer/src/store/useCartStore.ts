// In-memory cart for the current session only — no persistence, no backend
// order endpoint exists yet (specs/00-foundation/api-conventions.md has no
// /cart or /orders route wired to any screen). Every "ADD" button across the
// app (ProductCard, CategoryProductCard) calls addItem with the same shape,
// so the cart never needs to know which screen a product was added from.

import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  weight: string;
  price: number;
  quantity: number;
}

// What a card passes in — quantity starts at 1 and is tracked by the store,
// not the caller.
export type CartProduct = Omit<CartItem, 'quantity'>;

interface CartState {
  items: CartItem[];
  addItem: (product: CartProduct) => void;
  incrementItem: (id: string) => void;
  decrementItem: (id: string) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (product) =>
    set((state) => {
      const existing = state.items.find((item) => item.id === product.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity: 1 }] };
    }),

  incrementItem: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item)),
    })),

  decrementItem: (id) =>
    set((state) => ({
      items: state.items
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0),
    })),

  removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

  clear: () => set({ items: [] }),
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
export const CART_HANDLING_FEE = 5;

export function selectCartGrandTotal(state: CartState): number {
  return selectCartTotalPrice(state) + CART_DELIVERY_FEE + CART_HANDLING_FEE;
}

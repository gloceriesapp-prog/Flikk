// Wishlist — persisted on-device (zustand persist + AsyncStorage), keyed by
// product id. Same "denormalized snapshot, not just an id" shape useCartStore
// already uses for CartItem — WishlistScreen needs to render a real card
// (image/name/price) without a second fetch, and a product's price can
// legitimately drift after it's saved (same reasoning order_items.
// unit_price_at_order documents, CLAUDE.md) — the snapshot is what was true
// the moment it was hearted, not a live-updating price.
//
// Local-only for now, not synced to a backend account: no wishlist table/
// endpoint exists yet (unlike orders), and this app's own cart is the same
// kind of client-owned state today. Blinkit/Zepto/Instamart keep wishlists
// server-side tied to the account specifically so it survives a reinstall
// and follows the customer across devices — that's the natural v2 step once
// a real wishlist API exists (mirror how CLAUDE.md's own loyalty-points
// banner was deferred the same way), not something to fake with a local-only
// store pretending to be account state.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product } from '../screens/home/products/types';

interface WishlistState {
  items: Product[];
  isWishlisted: (id: string) => boolean;
  toggle: (product: Product) => void;
  remove: (id: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      isWishlisted: (id) => get().items.some((item) => item.id === id),

      toggle: (product) =>
        set((state) => {
          const exists = state.items.some((item) => item.id === product.id);
          return {
            items: exists ? state.items.filter((item) => item.id !== product.id) : [...state.items, product],
          };
        }),

      remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
    }),
    {
      name: 'flikk-wishlist',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

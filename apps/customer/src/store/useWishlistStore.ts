// Wishlist — real account-backed sync now (GET/POST/DELETE /wishlist,
// api/wishlist.ts), replacing the previous local-device-only zustand
// persist + AsyncStorage version. Same public shape every existing screen
// (ProductCardView, WishlistScreen) already reads — isWishlisted/toggle/
// remove — so nothing calling this store needed to change, only what's
// behind it.
//
// `toggle`/`remove` are optimistic: flip local state immediately (a heart
// icon that waits on a network round trip before filling in reads as
// broken), then fire the real request; on failure, revert and let the
// caller's own error surface however that screen already handles one
// (none of the three current call sites show a toast for this yet — same
// "no dedicated failure UI" gap useCartStore's own network calls have).
// `load()` is called once from RootNavigator after login, same pattern
// useAuthStore's other post-login hydration already follows.

import { create } from 'zustand';
import { addToWishlist, fetchWishlist, mapWishlistToProducts, removeFromWishlist } from '../api/wishlist';
import type { Product } from '../screens/home/products/types';

interface WishlistState {
  items: Product[];
  loaded: boolean;
  isWishlisted: (id: string) => boolean;
  toggle: (product: Product) => void;
  remove: (id: string) => void;
  load: () => Promise<void>;
  reset: () => void;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items: [],
  loaded: false,

  isWishlisted: (id) => get().items.some((item) => item.id === id),

  toggle: (product) => {
    const exists = get().items.some((item) => item.id === product.id);
    set((state) => ({
      items: exists ? state.items.filter((item) => item.id !== product.id) : [...state.items, product],
    }));

    const request = exists ? removeFromWishlist(product.id) : addToWishlist(product.id);
    request.catch(() => {
      // Revert on failure — put it back exactly how it was before the
      // optimistic flip, not just re-toggle blindly (a second tap in the
      // meantime could otherwise get clobbered).
      set((state) => ({
        items: exists ? [...state.items, product] : state.items.filter((item) => item.id !== product.id),
      }));
    });
  },

  remove: (id) => {
    const removed = get().items.find((item) => item.id === id);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
    if (!removed) return;
    removeFromWishlist(id).catch(() => {
      set((state) => (state.items.some((item) => item.id === id) ? state : { items: [...state.items, removed] }));
    });
  },

  load: async () => {
    try {
      const rows = await fetchWishlist();
      set({ items: mapWishlistToProducts(rows), loaded: true });
    } catch {
      // Network blip on load — leaves whatever was already in state (empty
      // on a cold start) rather than throwing through RootNavigator's own
      // post-login hydration; the next screen visit/pull-to-refresh can
      // retry via a fresh load() call.
    }
  },

  reset: () => set({ items: [], loaded: false }),
}));

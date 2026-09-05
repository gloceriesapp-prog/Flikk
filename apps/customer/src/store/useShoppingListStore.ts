// Shopping list — freeform notes ("milk, bread, eggs"), not tied to the
// product catalog like useCartStore/useWishlistStore are. Persisted
// on-device (zustand persist + AsyncStorage), same pattern
// useWishlistStore.ts already established — local-only for the same
// reason documented there: no backend list/notes table exists yet, this
// is client-owned state today.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ShoppingListItem {
  id: string;
  text: string;
  isChecked: boolean;
  createdAt: number;
}

interface ShoppingListState {
  items: ShoppingListItem[];
  addItem: (text: string) => void;
  toggleItem: (id: string) => void;
  removeItem: (id: string) => void;
  clearChecked: () => void;
}

export const useShoppingListStore = create<ShoppingListState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set((state) => ({
          items: [{ id: `${Date.now()}`, text: trimmed, isChecked: false, createdAt: Date.now() }, ...state.items],
        }));
      },

      toggleItem: (id) =>
        set((state) => ({
          items: state.items.map((item) => (item.id === id ? { ...item, isChecked: !item.isChecked } : item)),
        })),

      removeItem: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),

      clearChecked: () => set((state) => ({ items: state.items.filter((item) => !item.isChecked) })),
    }),
    {
      name: 'flikk-shopping-list',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

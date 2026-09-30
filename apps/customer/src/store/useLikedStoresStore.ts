// Liked stores — persisted on-device (zustand persist + AsyncStorage),
// keyed by store id only (not a full RealStore snapshot the way
// useWishlistStore.ts keeps for products — a store doesn't have a
// price that can drift the way a product does, so there's nothing worth
// snapshotting; useAllStores.ts's own live fetch is always the source of
// truth for the actual store data).
//
// Two places read/write this: StoreCard.tsx's own heart button toggles a
// single store; StoreFilterBar.tsx's heart button toggles "show liked
// stores only" as a filter over the whole list (StoreListScreen.tsx).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LikedStoresState {
  ids: string[];
  isLiked: (id: string) => boolean;
  toggle: (id: string) => void;
}

export const useLikedStoresStore = create<LikedStoresState>()(
  persist(
    (set, get) => ({
      ids: [],

      isLiked: (id) => get().ids.includes(id),

      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id) ? state.ids.filter((existing) => existing !== id) : [...state.ids, id],
        })),
    }),
    {
      name: 'gloceries-liked-stores',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Recently searched addresses — persisted on-device (zustand persist +
// AsyncStorage), same pattern as useLikedStoresStore.ts. Written by
// LocationSearchScreen.tsx every time a search actually resolves to real
// coordinates (typed + submitted, or a suggestion tapped); read by
// SelectLocationScreen.tsx's own "Recently searched" list.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Coordinates } from '../location/geocoding';

export interface RecentSearch extends Coordinates {
  label: string;
}

const MAX_RECENT = 5;

interface RecentSearchesState {
  entries: RecentSearch[];
  add: (entry: RecentSearch) => void;
}

export const useRecentSearchesStore = create<RecentSearchesState>()(
  persist(
    (set) => ({
      entries: [],

      add: (entry) =>
        set((state) => ({
          // Most recent first, deduped by label — re-searching the same
          // place moves it back to the top instead of listing it twice.
          entries: [entry, ...state.entries.filter((existing) => existing.label !== entry.label)].slice(0, MAX_RECENT),
        })),
    }),
    {
      name: 'gloceries-recent-searches',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

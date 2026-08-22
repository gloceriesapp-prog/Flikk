// Single source of truth for the store's own profile — StoreProfileHeader
// (Orders tab) and StoreSettingsScreen both read/write the same object now,
// same reasoning as useOrdersStore/useCatalogStore: the Open/Closed toggle
// on the header and an edit made in Settings need to agree with each
// other, which a per-screen useState can't guarantee.
//
// Still placeholder data underneath — no `PATCH` on the store record
// exists yet, same no-auth caveat as the rest of this app.

import { create } from 'zustand';
import { STORE_PROFILE, type StoreProfile } from '../screens/store-settings/data';

interface StoreProfileState {
  profile: StoreProfile;
  updateProfile: (patch: Partial<StoreProfile>) => void;
  toggleOpen: () => void;
}

export const useStoreProfileStore = create<StoreProfileState>((set) => ({
  profile: STORE_PROFILE,

  updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),

  toggleOpen: () => set((state) => ({ profile: { ...state.profile, isOpen: !state.profile.isOpen } })),
}));

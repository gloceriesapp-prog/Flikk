// Delivery-location state for the current session. Persisted in SecureStore so
// a returning user doesn't have to re-pick their address every cold start —
// same pattern as useAuthStore's token persistence.
//
// NOTE: this is local-only for now. specs/00-foundation/api-conventions.md's
// endpoint table has no /addresses route yet (the `addresses` table exists in
// data-model.md, but nothing wires it to the API). Saving here does not
// persist server-side — flag if/when a real "save address to account" flow
// is wanted, that's a backend endpoint to add deliberately, not bolt on here.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const LOCATION_KEY = 'flikk_customer_delivery_location';

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  addressLabel: string; // human-readable line, e.g. reverse-geocoded or typed
}

interface LocationState {
  location: DeliveryLocation | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setLocation: (location: DeliveryLocation) => Promise<void>;
  clear: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  isHydrated: false,

  hydrate: async () => {
    const raw = await SecureStore.getItemAsync(LOCATION_KEY);
    set({ location: raw ? (JSON.parse(raw) as DeliveryLocation) : null, isHydrated: true });
  },

  setLocation: async (location) => {
    await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(location));
    set({ location });
  },

  clear: async () => {
    await SecureStore.deleteItemAsync(LOCATION_KEY);
    set({ location: null });
  },
}));

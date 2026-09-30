// Delivery-location state for the current session. Persisted in SecureStore so
// a returning user doesn't have to re-pick their address every cold start —
// same pattern as useAuthStore's token persistence.
//
// recipientName rides along here (not its own store) — same lifecycle as
// the location itself: who to deliver to at this address, persisted so
// repeat orders don't ask again, editable at checkout when it's actually
// someone else receiving this one. Real quick-commerce apps (Blinkit/
// Instamart/Swiggy) all collect this — a rider at a gate/apartment
// security desk needs a name to ask for, not just a pinned location.
// Backend now genuinely requires it (POST /orders' own note,
// addresses.recipient_name) — this is no longer local-only display data.

import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const LOCATION_KEY = 'gloceries_customer_delivery_location';
const RECIPIENT_NAME_KEY = 'gloceries_customer_recipient_name';

export interface DeliveryLocation {
  latitude: number;
  longitude: number;
  addressLabel: string; // human-readable line, e.g. reverse-geocoded or typed
  city: string; // header/list display — city only, not the full address
}

interface LocationState {
  location: DeliveryLocation | null;
  recipientName: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setLocation: (location: DeliveryLocation) => Promise<void>;
  setRecipientName: (name: string) => Promise<void>;
  clear: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  recipientName: null,
  isHydrated: false,

  hydrate: async () => {
    const [raw, recipientName] = await Promise.all([
      SecureStore.getItemAsync(LOCATION_KEY),
      SecureStore.getItemAsync(RECIPIENT_NAME_KEY),
    ]);
    set({ location: raw ? (JSON.parse(raw) as DeliveryLocation) : null, recipientName, isHydrated: true });
  },

  setLocation: async (location) => {
    await SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(location));
    set({ location });
  },

  setRecipientName: async (name) => {
    await SecureStore.setItemAsync(RECIPIENT_NAME_KEY, name);
    set({ recipientName: name });
  },

  clear: async () => {
    await Promise.all([SecureStore.deleteItemAsync(LOCATION_KEY), SecureStore.deleteItemAsync(RECIPIENT_NAME_KEY)]);
    set({ location: null, recipientName: null });
  },
}));

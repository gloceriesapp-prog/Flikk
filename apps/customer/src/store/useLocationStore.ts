import { accountQueryClient } from '../features/account-session/accountCache';
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
  hydrationError: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setLocation: (location: DeliveryLocation) => Promise<void>;
  setRecipientName: (name: string) => Promise<void>;
  clear: () => Promise<void>;
}

let locationEpoch = 0;
let persistence: Promise<void> = Promise.resolve();
function persist(action: () => Promise<void>) {
  const work = persistence.catch(() => {}).then(action);
  persistence = work;
  return work;
}

export const useLocationStore = create<LocationState>((set) => ({
  location: null,
  recipientName: null,
  isHydrated: false,
  hydrationError: null,

  hydrate: async () => {
    const epoch = locationEpoch;
    set({ hydrationError: null });
    try {
      const [raw, recipientName] = await Promise.all([
        SecureStore.getItemAsync(LOCATION_KEY), SecureStore.getItemAsync(RECIPIENT_NAME_KEY),
      ]);
      if (epoch !== locationEpoch) return;
      let location: DeliveryLocation | null = null;
      try {
        const value = raw ? JSON.parse(raw) : null;
        if (value && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90
          && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
          && typeof value.addressLabel === 'string' && typeof value.city === 'string') location = value;
      } catch { /* Discard a corrupt saved pin; the user can select a new one. */ }
      set({ location, recipientName: location ? recipientName : null, isHydrated: true });
    } catch {
      if (epoch !== locationEpoch) return;
      set({ location: null, recipientName: null, isHydrated: true,
        hydrationError: 'We couldn’t restore your delivery location. Please try again.' });
    }
  },

  setLocation: async (location) => {
    set({ location });
    // Reset public assortment queries on address change; in-flight responses
    // are also fenced by apiRequest's captured delivery pin.
    void accountQueryClient().resetQueries({ predicate: query => ['home', 'category-detail', 'search', 'store-list'].includes(String(query.queryKey[0])) });
    await persist(() => SecureStore.setItemAsync(LOCATION_KEY, JSON.stringify(location)));
  },

  setRecipientName: async (name) => {
    set({ recipientName: name });
    await persist(() => SecureStore.setItemAsync(RECIPIENT_NAME_KEY, name));
  },

  clear: async () => {
    locationEpoch += 1;
    set({ location: null, recipientName: null, isHydrated: true });
    await persist(async () => { await Promise.all([SecureStore.deleteItemAsync(LOCATION_KEY), SecureStore.deleteItemAsync(RECIPIENT_NAME_KEY)]); });
  },
}));

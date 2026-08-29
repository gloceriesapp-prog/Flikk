// Single source of truth for the store's own profile — StoreProfileHeader
// (Orders tab) and StoreSettingsScreen both read/write the same object now,
// same reasoning as useOrdersStore/useCatalogStore: the Open/Closed toggle
// on the header and an edit made in Settings need to agree with each
// other, which a per-screen useState can't guarantee.
//
// Backed by real GET/PATCH /partner/store now (backend/src/routes/
// partner.ts) — loadProfile() is called once from OrdersScreen's mount
// effect, same "once per app session, once a real session exists" pattern
// as registerPushToken. toggleOpen/updateProfile apply locally first (the
// toggle needs to feel instant mid-rush, see StoreProfileHeader.tsx's own
// note) then PATCH in the background; a failed PATCH is logged, not rolled
// back — same best-effort tolerance as this app's draft autosaves.

import { create } from 'zustand';
import { apiRequest } from '../api/client';
import { EMPTY_STORE_PROFILE, type StoreProfile } from '../screens/store-settings/data';

interface StoreRow {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  district: string | null;
  photo_url: string | null;
  phone: string | null;
  open_time: string | null;
  close_time: string | null;
  avg_prep_minutes: number;
}

function fromRow(row: StoreRow): StoreProfile {
  return {
    id: row.id,
    storeName: row.name,
    category: row.category,
    isOpen: row.is_active,
    district: row.district ?? '',
    photoUrl: row.photo_url,
    hasUnreadNotifications: false,
    openTime: row.open_time ?? '',
    closeTime: row.close_time ?? '',
    avgPrepMinutes: row.avg_prep_minutes,
    phone: row.phone ?? '',
  };
}

interface StoreProfileState {
  profile: StoreProfile;
  loadProfile: () => Promise<void>;
  updateProfile: (patch: Partial<StoreProfile>) => void;
  toggleOpen: () => void;
}

export const useStoreProfileStore = create<StoreProfileState>((set, get) => ({
  profile: EMPTY_STORE_PROFILE,

  loadProfile: async () => {
    try {
      const row = await apiRequest<StoreRow>('/partner/store');
      set({ profile: fromRow(row) });
    } catch {
      // Best-effort — a failed load just leaves the previous/empty profile
      // on screen, same tolerance as the rest of this app's background reads.
    }
  },

  updateProfile: (patch) => {
    set((state) => ({ profile: { ...state.profile, ...patch } }));
    const { id } = get().profile;
    if (!id) return;
    apiRequest('/partner/store', {
      method: 'PATCH',
      body: {
        name: patch.storeName,
        category: patch.category,
        district: patch.district,
        open_time: patch.openTime,
        close_time: patch.closeTime,
        avg_prep_minutes: patch.avgPrepMinutes,
      },
    }).catch(() => {});
  },

  toggleOpen: () => {
    set((state) => ({ profile: { ...state.profile, isOpen: !state.profile.isOpen } }));
    const { id, isOpen } = get().profile;
    if (!id) return;
    apiRequest('/partner/store', { method: 'PATCH', body: { is_active: isOpen } }).catch(() => {});
  },
}));

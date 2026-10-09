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
import { apiRequest, ApiError } from '../api/client';
import { EMPTY_STORE_PROFILE, type StoreProfile, type StoreProfileChange } from '../screens/store-settings/data';

interface ChangeRow {
  id: string;
  status: StoreProfileChange['status'];
  changes: StoreProfileChange['changes'];
  review_reason: string | null;
  created_at: string;
}

function fromChange(row: ChangeRow | null | undefined): StoreProfileChange | null {
  return row ? { id: row.id, status: row.status, changes: row.changes ?? {}, reviewReason: row.review_reason, createdAt: row.created_at } : null;
}

interface StoreRow {
  access_role?: 'owner' | 'manager';
  id: string;
  name: string;
  category: string;
  is_active: boolean;
  admin_suspended?: boolean;
  suspended_reason?: string | null;
  district: string | null;
  address_line: string | null;
  manual_address: string | null;
  lat: number | null;
  lng: number | null;
  photo_url: string | null;
  phone: string | null;
  open_time: string | null;
  close_time: string | null;
  avg_prep_minutes: number | null;
  owner_name: string | null;
  gst_number: string | null;
  shop_establishment_number: string | null;
  fssai_number: string | null;
  pan_number: string | null;
  drug_license_number?: string | null;
  pending_change?: ChangeRow | null;
  last_change_review?: ChangeRow | null;
}

function fromRow(row: StoreRow): StoreProfile {
  return {
    id: row.id,
    accessRole: row.access_role ?? 'owner',
    storeName: row.name,
    category: row.category,
    isOpen: row.is_active,
    adminSuspended: row.admin_suspended === true,
    suspendedReason: row.suspended_reason ?? null,
    district: row.district ?? '',
    addressLine: row.address_line,
    manualAddress: row.manual_address ?? '',
    lat: row.lat,
    lng: row.lng,
    photoUrl: row.photo_url,
    hasUnreadNotifications: false,
    openTime: row.open_time ?? '',
    closeTime: row.close_time ?? '',
    // Real stores can have avg_prep_minutes: null (never set) — falls
    // back to the same 5-minute default EMPTY_STORE_PROFILE uses, so a
    // store that's never touched this setting shows a real, sane number
    // instead of "null min" until they save once (which then always
    // sends a real number, see PATCH's own avg_prep_minutes handling).
    avgPrepMinutes: row.avg_prep_minutes ?? 5,
    phone: row.phone ?? '',
    ownerName: row.owner_name ?? '',
    gstNumber: row.gst_number ?? '',
    shopLicenseNumber: row.shop_establishment_number ?? '',
    fssaiNumber: row.fssai_number ?? '',
    panNumber: row.pan_number ?? '',
    drugLicenseNumber: row.drug_license_number ?? '',
    pendingChange: fromChange(row.pending_change),
    lastChangeReview: fromChange(row.last_change_review),
  };
}

// updateProfile's PATCH can genuinely fail now (server-side FSSAI/PAN
// format validation, see backend/src/routes/partner.ts) — callers that
// need to show the owner why a save didn't take (StoreSettingsScreen's
// Save button) can await this and read `ok`/`error`; fire-and-forget
// callers (photo upload, the Open/Closed toggle) can just ignore it since
// it never rejects.
// pendingReview: the save filed a name/category/address/map-pin change that
// Gloceries must approve before it goes live (migration 114).
export type ProfileSaveResult = { ok: true; pendingReview: boolean } | { ok: false; error: string };

interface StoreProfileState {
  profile: StoreProfile;
  loadProfile: () => Promise<void>;
  updateProfile: (patch: Partial<StoreProfile>) => Promise<ProfileSaveResult>;
  toggleOpen: () => void;
}

export const useStoreProfileStore = create<StoreProfileState>((set, get) => ({
  profile: EMPTY_STORE_PROFILE,

  loadProfile: async () => {
    try {
      const row = await apiRequest<StoreRow>('/partner/store');
      set({ profile: fromRow(row) });
    } catch (err) {
      // Logged, not just swallowed — a silent failure here left the header
      // and Settings screen stuck on EMPTY_STORE_PROFILE forever with zero
      // visible sign anything was wrong (the actual bug behind "photo and
      // location aren't showing"). Still best-effort (no user-facing error
      // — a transient failed load just means blanks until the next
      // successful one), but at least now it shows up in logs.
      console.error('[useStoreProfileStore] loadProfile failed', err);
      // Best-effort — a failed load just leaves the previous/empty profile
      // on screen, same tolerance as the rest of this app's background reads.
    }
  },

  updateProfile: async (patch) => {
    const before = get().profile;
    set((state) => ({ profile: { ...state.profile, ...patch } }));
    const { id } = get().profile;
    if (!id) return { ok: true, pendingReview: false };
    try {
      const row = await apiRequest<StoreRow>('/partner/store', {
        method: 'PATCH',
        body: {
          name: patch.storeName,
          category: patch.category,
          district: patch.district,
          address_line: patch.addressLine,
          manual_address: patch.manualAddress,
          lat: patch.lat,
          lng: patch.lng,
          open_time: patch.openTime,
          close_time: patch.closeTime,
          avg_prep_minutes: patch.avgPrepMinutes,
          photo_url: patch.photoUrl,
          owner_name: patch.ownerName,
          gst_number: patch.gstNumber,
          shop_establishment_number: patch.shopLicenseNumber,
          fssai_number: patch.fssaiNumber,
          pan_number: patch.panNumber,
          drug_license_number: patch.drugLicenseNumber,
        },
      });
      // The server's copy wins: reviewed fields keep their live values and
      // the pending request rides along for the "pending review" notice.
      const saved = fromRow(row);
      set({ profile: saved });
      return { ok: true, pendingReview: saved.pendingChange !== null && saved.pendingChange.id !== before.pendingChange?.id };
    } catch (err) {
      set({ profile: before });
      const message = err instanceof ApiError ? err.message : 'Could not save changes. Check your connection and try again.';
      return { ok: false, error: message };
    }
  },

  toggleOpen: () => {
    // Suspended by Gloceries: the switch is disabled in the UI and the
    // backend refuses to reopen (409 STORE_SUSPENDED) — never flip locally.
    if (get().profile.adminSuspended) return;
    set((state) => ({ profile: { ...state.profile, isOpen: !state.profile.isOpen } }));
    const { id, isOpen } = get().profile;
    if (!id) return;
    apiRequest('/partner/store', { method: 'PATCH', body: { is_active: isOpen } }).catch((err) => {
      // Suspended since the last load — undo the optimistic flip and pull
      // the real state (with the reason) so the banner shows.
      if (err instanceof ApiError && err.code === 'STORE_SUSPENDED') {
        set((state) => ({ profile: { ...state.profile, isOpen: false, adminSuspended: true } }));
        void get().loadProfile();
      }
    });
  },
}));

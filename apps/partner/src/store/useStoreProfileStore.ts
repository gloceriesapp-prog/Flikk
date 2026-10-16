import { create } from 'zustand';
import { normalizeStoreHour } from '../utils/storeHours';
import { getSessionEpoch, isCurrentSession, onSessionReset } from './sessionScope';
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
  availability_override?: boolean | null;
  availability_override_until?: string | null;
  availability_next_change_at?: string | null;
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
  // The owner's three private, encrypted KYC photos — each a decrypt-proxy
  // URL (GET /partner/documents/:id, bearer-auth required) or null when not
  // uploaded. camelCase, unlike the snake_case columns above, because the
  // backend derives these per-request rather than storing them as columns.
  profilePhotoUrl?: string | null;
  aadhaarPhotoUrl?: string | null;
  storePhotoUrl?: string | null;
  pending_change?: ChangeRow | null;
  last_change_review?: ChangeRow | null;
}

// GET /partner/store now also returns the owner's three private, encrypted
// KYC photos as decrypt-proxy URLs. Extended here, not in data.ts's canonical
// StoreProfile, since only Settings' "My documents" viewer reads them —
// everything else in the app works off the plain StoreProfile shape.
export interface StoreProfileWithDocs extends StoreProfile {
  profilePhotoUrl: string | null;
  aadhaarPhotoUrl: string | null;
  storePhotoUrl: string | null;
}

function fromRow(row: StoreRow): StoreProfileWithDocs {
  return {
    id: row.id,
    accessRole: row.access_role ?? 'owner',
    storeName: row.name,
    category: row.category,
    isOpen: row.is_active,
    availabilityOverride: row.availability_override ?? null,
    availabilityOverrideUntil: row.availability_override_until ?? null,
    availabilityNextChangeAt: row.availability_next_change_at ?? null,
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
    profilePhotoUrl: row.profilePhotoUrl ?? null,
    aadhaarPhotoUrl: row.aadhaarPhotoUrl ?? null,
    storePhotoUrl: row.storePhotoUrl ?? null,
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
  profile: StoreProfileWithDocs;
  loadProfile: () => Promise<void>;
  updateProfile: (patch: Partial<StoreProfile>) => Promise<ProfileSaveResult>;
  toggleOpen: () => Promise<void>;
  setAvailability: (mode: 'auto' | 'open' | 'closed') => Promise<void>;
  togglingOpen: boolean;
  statusError: string | null;
}

let profileWrites: Promise<unknown> = Promise.resolve();
let profileRevision = 0;

export const useStoreProfileStore = create<StoreProfileState>((set, get) => ({
  profile: { ...EMPTY_STORE_PROFILE, profilePhotoUrl: null, aadhaarPhotoUrl: null, storePhotoUrl: null },

  togglingOpen: false,
  statusError: null,

  loadProfile: async () => {
    const epoch = getSessionEpoch();
    const revision = profileRevision;
    try {
      const row = await apiRequest<StoreRow>('/partner/store');
      if (isCurrentSession(epoch) && revision === profileRevision) set({ profile: fromRow(row) });
    } catch (err) {
      // Logged, not just swallowed — a silent failure here left the header
      // and Settings screen stuck on EMPTY_STORE_PROFILE forever with zero
      // visible sign anything was wrong (the actual bug behind "photo and
      // location aren't showing"). Still best-effort (no user-facing error
      // — a transient failed load just means blanks until the next
      // successful one), but at least now it shows up in logs.
      // A recoverable refresh failure must not open Android's blocking LogBox.
      if (typeof __DEV__ !== 'undefined' && __DEV__ && isCurrentSession(epoch)) console.warn('[useStoreProfileStore] loadProfile failed', err);
      // Best-effort — a failed load just leaves the previous/empty profile
      // on screen, same tolerance as the rest of this app's background reads.
    }
  },

  updateProfile: (patch) => {
    const epoch = getSessionEpoch();
    const operation = profileWrites.catch(() => {}).then(async (): Promise<ProfileSaveResult> => {
    if (!isCurrentSession(epoch)) return { ok: false, error: "Your account changed. Please try again." };
    const openTime = patch.openTime === undefined ? undefined : normalizeStoreHour(patch.openTime);
    const closeTime = patch.closeTime === undefined ? undefined : normalizeStoreHour(patch.closeTime);
    if (openTime === null || closeTime === null) return { ok: false, error: 'Enter valid opening and closing times, such as 9:00 AM or 9:00 PM (IST).' };
    profileRevision += 1;
    const before = get().profile;
    const optimisticPatch = { ...patch };
    // Reviewed fields must not briefly masquerade as the live pickup point.
    for (const key of ['storeName', 'category', 'district', 'addressLine', 'manualAddress', 'lat', 'lng', 'drugLicenseNumber'] as const) delete optimisticPatch[key];
    set((state) => ({ profile: { ...state.profile, ...optimisticPatch } }));
    const { id } = get().profile;
    if (!id) { set({ profile: before }); return { ok: false, error: "Store profile is not loaded. Please try again." }; }
    try {
      const row = await apiRequest<StoreRow>('/partner/store', {
        method: 'PATCH',
        body: {
          is_active: patch.isOpen,
          name: patch.storeName,
          category: patch.category,
          district: patch.district,
          address_line: patch.addressLine,
          manual_address: patch.manualAddress,
          lat: patch.lat,
          lng: patch.lng,
          open_time: openTime,
          close_time: closeTime,
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
      if (!isCurrentSession(epoch)) return { ok: false, error: "Your account changed. Please try again." };
      set({ profile: saved });
      return { ok: true, pendingReview: saved.pendingChange !== null && saved.pendingChange.id !== before.pendingChange?.id };
    } catch (err) {
      if (isCurrentSession(epoch)) set({ profile: before });
      const message = err instanceof ApiError ? err.message : 'Could not save changes. Check your connection and try again.';
      return { ok: false, error: message };
    }
    });
    profileWrites = operation;
    return operation;
  },

  toggleOpen: async () => get().setAvailability(get().profile.isOpen ? 'closed' : 'open'),

  setAvailability: async (mode) => {
    if (get().profile.adminSuspended || get().togglingOpen || !get().profile.id) return;
    const epoch = getSessionEpoch();
    set({ togglingOpen: true, statusError: null });
    const operation = profileWrites.catch(() => {}).then(async () => {
      if (!isCurrentSession(epoch)) return;
      profileRevision += 1;
      try {
        const row = await apiRequest<StoreRow>('/partner/store/availability', { method: 'PATCH', body: { mode } });
        if (isCurrentSession(epoch)) set({ profile: fromRow(row), togglingOpen: false, statusError: null });
      } catch (error) {
        if (!isCurrentSession(epoch)) return;
        set({ togglingOpen: false, statusError: error instanceof ApiError ? error.message : 'Could not save store availability. Check your connection and retry.' });
        void get().loadProfile();
      }
    });
    profileWrites = operation;
    await operation;
  },
}));

onSessionReset(() => {
  profileRevision += 1;
  profileWrites = Promise.resolve();
  useStoreProfileStore.setState({
    profile: { ...EMPTY_STORE_PROFILE, profilePhotoUrl: null, aadhaarPhotoUrl: null, storePhotoUrl: null },
    togglingOpen: false, statusError: null,
  });
});

// Canonical StoreProfile — this screen (P6) owns the shape now, extended
// from the smaller version that used to live in screens/orders/data.ts
// (that file re-exports from here for backward compatibility with
// existing imports, see its own note). Mirrors `stores`
// (specs/00-foundation/data-model.md: id, owner_user_id, zone_id, name,
// category, rating, avg_prep_minutes, is_active) — every field here maps
// to a real column, nothing speculative.
//
// Same no-auth caveat as everywhere else in this app: no `PATCH` on the
// store record exists yet (specs/02-partner-app/api.md's own note — P6
// has no dedicated endpoint, becomes a PATCH scoped to the owner's own
// store_id once one exists). Edits here only ever touch
// useStoreProfileStore, not a server.

export interface StoreProfile {
  id: string;
  storeName: string;
  category: string;
  isOpen: boolean;
  district: string;
  // The real reverse-geocoded full address (stores.address_line, captured
  // during onboarding's LocationPinScreen) — null for any store approved
  // before this field existed. StoreProfileHeader falls back to district
  // when this is null, never shows a blank line.
  addressLine: string | null;
  // A genuinely different field from addressLine above — the shop
  // owner's own typed description (e.g. "Near Bus Stand, opposite Xyz
  // store"), never derived from the map pin. Editable directly in
  // StoreSettingsScreen's Location card, saved through the normal Save
  // button (unlike addressLine/lat/lng below, which apply instantly the
  // moment the map confirms a new pin).
  manualAddress: string;
  // Real stores.lat/lng — the exact pin position "Change on map" sets
  // (LocationPinScreen, same real reverse-geocode + drag-to-confirm flow
  // onboarding already uses). null for any store approved before this
  // was ever pinned.
  lat: number | null;
  lng: number | null;
  // Real storefront photo (stores.photo_url, set during onboarding) — null
  // until one's uploaded, StoreProfileHeader/StoreSettingsScreen fall back
  // to a seeded placeholder keyed by `id`, never a fake name.
  photoUrl: string | null;
  hasUnreadNotifications: boolean;
  // "9:00 AM" / "9:00 PM" — free text, not a time picker component, at
  // this scale. Store hours are informational display only for now (the
  // live Open/Closed toggle on the Orders header is the thing that
  // actually gates order visibility, per stores.is_active).
  openTime: string;
  closeTime: string;
  // Mirrors stores.avg_prep_minutes — shown to a customer as an ETA input
  // once the customer app reads it; a shop owner tuning this is tuning
  // what customers are told to expect.
  avgPrepMinutes: number;
  // Read-only here — editing it means re-verifying via OTP, which is P1's
  // job, not this screen's. Shown masked, same convention a bank app uses
  // for a linked number it won't let you silently change.
  phone: string;
  // Payout destination is NOT part of the store profile — it has its own
  // endpoint (GET/PUT /partner/payout-account, backend/PAYOUTS.md) and is
  // read via TanStack Query in PayoutAccountCard / OrdersScreen.
  // Mirrors stores.owner_name/gst_number/shop_establishment_number — set
  // during onboarding (StoreSetupScreen/StoreDetailsScreen), editable here
  // too so an owner who skipped them at signup can add them later. All
  // three optional, same as GST always was.
  ownerName: string;
  gstNumber: string;
  shopLicenseNumber: string;
  // Mirrors stores.fssai_number/pan_number — format-validated (regex only,
  // not government-database verified, see
  // utils/documentValidation.ts's own note on why) both client- and
  // server-side (routes/partner.ts's PATCH /store).
  fssaiNumber: string;
  panNumber: string;
}

// One list, not a free-text field — same "pick from a fixed set, not
// typed free-hand" reasoning as catalog size variants: a store's category
// drives filtering/discovery on the customer app, so keeping it off a
// known list is what makes that filtering possible at all.
export const STORE_CATEGORIES = [
  'Kirana & Grocery',
  'Supermarket',
  'Pharmacy',
  'Bakery',
  'Fruits & Vegetables',
  'Hardware',
  'Paint Shop',
  'Steel & Vessels',
  'General Store',
];

// Empty shell — real data loads via GET /partner/store (useStoreProfileStore's
// loadProfile) the moment a session exists. Never rendered as-is on a real
// device: OrdersScreen's mount effect calls loadProfile before this would
// show, this is just a safe non-null default for the brief window before
// that resolves.
export const EMPTY_STORE_PROFILE: StoreProfile = {
  id: '',
  storeName: '',
  category: '',
  isOpen: false,
  district: '',
  addressLine: null,
  manualAddress: '',
  lat: null,
  lng: null,
  photoUrl: null,
  hasUnreadNotifications: false,
  openTime: '',
  closeTime: '',
  avgPrepMinutes: 5,
  phone: '',
  ownerName: '',
  gstNumber: '',
  shopLicenseNumber: '',
  fssaiNumber: '',
  panNumber: '',
};

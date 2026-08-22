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
  storeName: string;
  category: string;
  isOpen: boolean;
  // District only, not a full street address — see StoreProfileHeader.tsx's
  // own note on why. A full address belongs here once one is needed.
  district: string;
  avatarSeed: string;
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
}

// One list, not a free-text field — same "pick from a fixed set, not
// typed free-hand" reasoning as catalog size variants: a store's category
// drives filtering/discovery on the customer app, so keeping it off a
// known list is what makes that filtering possible at all.
export const STORE_CATEGORIES = ['Kirana & Grocery', 'Pharmacy', 'Bakery', 'Fruits & Vegetables', 'General Store'];

export const STORE_PROFILE: StoreProfile = {
  storeName: 'Ganesh Kirana Store',
  category: 'Kirana & Grocery',
  isOpen: true,
  district: 'Udupi',
  avatarSeed: 'partner-owner-ganesh',
  hasUnreadNotifications: true,
  openTime: '8:00 AM',
  closeTime: '9:00 PM',
  avgPrepMinutes: 15,
  phone: '+91 98765 43210',
};

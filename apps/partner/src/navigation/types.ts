// Central param-list definitions — one place to see every screen and what
// it needs. Bottom-tab structure per specs/02-partner-app/screens.md:
// Orders / Catalog / Payouts. Orders (the order queue, P2) doubles as this
// app's home screen — there's no separate "Home" tab, see that spec's own
// note.
//
// AuthStackParamList (P1) is separate from AppStackParamList — RootNavigator
// renders one or the other, never both at once, same split as
// apps/customer/src/navigation/{RootNavigator,AuthNavigator}.tsx.

// The 3-step Store Setup wizard's accumulating state — each step fills in
// more of it and passes the whole thing forward as a route param (this
// stack is never deep-linked, so a plain threaded object is the smaller
// diff than a store slice for a one-shot 3-screen handoff). photoUrl is
// only ever a *hosted* URL (StoreDetailsScreen uploads immediately after
// picking, see uploadStorePhoto) — StoreReviewScreen never deals with a
// local file URI.
export interface StoreDraft {
  storeName: string;
  category: string;
  district: string | null;
  coordinates: import('../location/geocoding').Coordinates | null;
  photoUrl: string | null;
  gstNumber: string;
}

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  // devMode flags that requestOtp fell back to the local dev stand-in
  // (backend unreachable — see api/devAuthFallback.ts) so this screen can
  // show the fixed demo code instead of leaving "why doesn't my real SMS
  // arrive" a mystery.
  OtpVerification: { phone: string; devMode: boolean };
  // Only reached when the verify response says has_store: false — an
  // existing, already-onboarded owner skips straight past this. Step 1/3:
  // name + category only, starts a fresh StoreDraft.
  StoreSetup: undefined;
  // Step 2/3: photo + location + optional GST — appends to the draft
  // step 1 started.
  StoreDetails: { draft: StoreDraft };
  // Step 3/3: read-only summary + the actual submit — no field entry here,
  // just confirming what steps 1-2 collected.
  StoreReview: { draft: StoreDraft };
  // Full-screen draggable-pin confirm step reached from StoreDetails'
  // "Enable location" button. onConfirm is a plain callback, not a
  // serialized param — see StoreDraft's own note on why a threaded object
  // is enough for this whole wizard.
  LocationPin: {
    initialCoordinates: import('../location/geocoding').Coordinates | null;
    onConfirm: (coordinates: import('../location/geocoding').Coordinates, district: string) => void;
  };
};

export type AppStackParamList = {
  Orders: undefined;
  Catalog: undefined;
  Payouts: undefined;
  // Order detail (P3) — reached from OrderCard's "View Order". Only an id
  // is passed, not the whole order object; the screen reads the live
  // order from ../store/useOrdersStore.ts (see that file's own note on why).
  OrderDetail: { orderId: string };
  // Product detail (part of P4) — reached from ProductRow's "View". Same
  // id-only pattern as OrderDetail; the screen reads the live product from
  // ../store/useCatalogStore.ts.
  ProductDetail: { productId: string };
  // Full order-by-order breakdown for one settlement (part of P5) —
  // reached from "View all orders" on either payout card. A weekly
  // settlement's order count only grows, so this list belongs on its own
  // screen, not inline on the card (see PayoutOrdersLink.tsx's own note).
  // weekLabel doubles as the id — already unique across
  // PLACEHOLDER_PAYOUTS, same as its use as a list `key` elsewhere.
  PayoutOrderHistory: { weekLabel: string };
  // Store settings (P6) — reached from StoreProfileHeader's gear icon.
  // No params; reads/writes the shared ../store/useStoreProfileStore.ts.
  StoreSettings: undefined;
};

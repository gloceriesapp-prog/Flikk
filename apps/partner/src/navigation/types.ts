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
  // The full reverse-geocoded address (LocationPinScreen's own
  // reverseGeocodeAddress) — used to just build that screen's own confirm
  // card, then discarded; now carried all the way through to
  // stores.address_line so a real address shows in StoreProfileHeader
  // instead of just the district.
  addressLine: string | null;
  coordinates: import('../location/geocoding').Coordinates | null;
  photoUrl: string | null;
  gstNumber: string;
  ownerName: string;
  shopLicenseNumber: string;
}

export type AuthStackParamList = {
  // Welcome is no longer a route in this stack — RootNavigator.tsx renders
  // it directly as a fixed-duration splash gate (matching apps/customer's
  // own WelcomeScreen/RootNavigator pattern), before either stack ever
  // mounts. Login is this stack's real first screen now.
  Login: undefined;
  // devMode flags that requestOtp fell back to the local dev stand-in
  // (backend unreachable — see api/devAuthFallback.ts) so this screen can
  // show the fixed demo code instead of leaving "why doesn't my real SMS
  // arrive" a mystery.
  OtpVerification: { phone: string; devMode: boolean };
  // Only reached when the verify response says has_store: false — an
  // existing, already-onboarded owner skips straight past this. Step 1/3:
  // name + category only, starts a fresh StoreDraft. `draft` is only set
  // when reached via an "Edit" tap from StoreReviewScreen — its presence
  // is what skips the cold-start "resume where you left off" fetch below
  // (see StoreSetupScreen.tsx's own note), so editing never gets hijacked
  // by that auto-forward-to-Review logic.
  StoreSetup: { draft?: StoreDraft } | undefined;
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
    // addressLine is the real reverse-geocoded full address this screen
    // already computes for its own confirm card (reverseGeocodeAddress) —
    // now threaded onward instead of discarded, so StoreProfileHeader can
    // show a real address, not just district.
    onConfirm: (coordinates: import('../location/geocoding').Coordinates, district: string, addressLine: string | null) => void;
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
  // New-product form (part of P4) — reached from Inventory's own "Add
  // product" button (InventorySummaryCard). No params: unlike ProductDetail
  // this isn't reading an existing product, it's writing a brand new one.
  AddProduct: undefined;
  // Full order-by-order breakdown for one settlement (part of P5) —
  // reached from "View all orders" on either payout card. A weekly
  // settlement's order count only grows, so this list belongs on its own
  // screen, not inline on the card (see PayoutOrdersLink.tsx's own note).
  // payoutId is the real payouts.id used to fetch the real order-by-order
  // breakdown (GET /partner/payouts/:id/orders) — weekLabel is display-
  // only, carried along so the header can render instantly without
  // waiting on that fetch. isSample/sampleTotals thread through only for
  // screens/payouts/data.ts's own sample fallback (a brand-new store with
  // zero real payouts yet) — that payoutId is a fake "sample-*" string
  // GET /partner/payouts/:id/orders would 404 on, so this screen builds
  // its sample order breakdown from these numbers instead of fetching.
  PayoutOrderHistory: {
    payoutId: string;
    weekLabel: string;
    isSample?: boolean;
    sampleTotals?: { orderCount: number; grossAmount: number; commissionAmount: number };
  };
  // Store settings (P6) — reached from StoreProfileHeader's gear icon.
  // No params; reads/writes the shared ../store/useStoreProfileStore.ts.
  StoreSettings: undefined;
};

// Central param-list definitions — one place to see every screen and what
// it needs. Bottom-tab structure per specs/02-partner-app/screens.md:
// Orders / Catalog / Payouts. Orders (the order queue, P2) doubles as this
// app's home screen — there's no separate "Home" tab, see that spec's own
// note.
//
// AuthStackParamList (P1) is separate from AppStackParamList — RootNavigator
// renders one or the other, never both at once, same split as
// apps/customer/src/navigation/{RootNavigator,AuthNavigator}.tsx.

// The onboarding wizard's accumulating state — each step fills in more of
// it and passes the whole thing forward as a route param (this stack is
// never deep-linked, so a plain threaded object is the smaller diff than a
// store slice). Rebuilt as a real 6-step flow (Intro → Store Details →
// Store Location → Owner Details → Business Documents → Store Hours →
// Review), one focused topic per screen, replacing the older 3-step
// version that had crammed photo/location/four documents into one screen.
//
// Photo is deliberately no longer collected during onboarding — dropped
// per an explicit ask to keep the wizard lightweight; a store owner adds
// one anytime afterward via StoreSettingsScreen, same as changing it later
// always worked. FSSAI/Shop & Establishment license are still real,
// storable fields (kept here and on the backend, still editable in
// StoreSettingsScreen post-approval) but are no longer collected in the
// wizard itself — only PAN/GST/Udyam are, per the new Business Documents
// step's own explicit field list.
export interface StoreDraft {
  storeName: string;
  category: string;
  // Store's own contact number — a real, separate field from the
  // account's own OTP-verified login phone (Owner Details step shows that
  // one read-only). A shop's landline/alternate number, not assumed to be
  // the same as whoever's holding the phone during onboarding.
  phone: string;
  district: string | null;
  // The full reverse-geocoded address (LocationPinScreen's own
  // reverseGeocodeAddress) — carried through to stores.address_line so a
  // real address shows in StoreProfileHeader instead of just the district.
  addressLine: string | null;
  // A genuinely different field from addressLine above — the shop owner's
  // own typed description, never derived from the map pin.
  manualAddress: string;
  coordinates: import('../location/geocoding').Coordinates | null;
  photoUrl: string | null;
  gstNumber: string;
  ownerName: string;
  // Owner's own optional contact email — a real users.email column,
  // distinct from Supabase Auth's own internal email field (this app
  // never uses email/password auth).
  ownerEmail: string;
  shopLicenseNumber: string;
  fssaiNumber: string;
  panNumber: string;
  // Udyam/business registration number — optional, same "add later if you
  // don't have one" treatment as GST (Business Documents step's own copy).
  udyamNumber: string;
  // "9:00 AM" / "9:00 PM" — same free-text shape StoreProfile's own
  // openTime/closeTime always used (TimeDigitsInput.tsx), now collected
  // during onboarding instead of left entirely to Store Settings
  // afterward.
  openTime: string;
  closeTime: string;
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
  // existing, already-onboarded owner skips straight past this. Screen 1
  // of the wizard: no fields, just "Get Started" — that tap is what
  // fetches the saved draft and decides which real step to resume at
  // (OnboardingIntroScreen.tsx's own note), not a cold-start effect the
  // way the old StoreSetupScreen did it. `draft` is only set when reached
  // via an "Edit" tap from StoreReviewScreen.
  OnboardingIntro: { draft?: StoreDraft } | undefined;
  // Store name, category, store's own contact phone — no address/photo
  // here anymore, each now has its own dedicated step.
  StoreDetails: { draft: StoreDraft };
  // Dedicated "mark your store on the map" step — wraps the same real
  // map-pin flow LocationPin already is (reused, not reinvented), just as
  // its own linear wizard step instead of a sub-action buried inside
  // Store Details.
  StoreLocation: { draft: StoreDraft };
  // Owner's own full name, their real OTP-verified login phone (read-only
  // display), optional email.
  OwnerDetails: { draft: StoreDraft };
  // PAN (required) / GST (optional) / Udyam (optional) — no FSSAI/shop
  // license here anymore, see StoreDraft's own note on why.
  BusinessDocuments: { draft: StoreDraft };
  // Regular opening/closing hours — same free-text "9:00 AM"/"9:00 PM"
  // shape Store Settings already uses.
  StoreHours: { draft: StoreDraft };
  // Final step: read-only summary + the actual submit — no field entry
  // here, just confirming what every earlier step collected.
  StoreReview: { draft: StoreDraft };
  // Full-screen draggable-pin confirm step reached from StoreLocation.
  // onConfirm is a plain callback, not a serialized param — see
  // StoreDraft's own note on why a threaded object is enough for this
  // whole wizard.
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
  // Same real map-pin screen onboarding's own AuthStackParamList already
  // registers (LocationPinScreen) — registered again here so
  // StoreSettingsScreen's own "Change on map" can reach it post-approval;
  // AppNavigator and AuthNavigator are two separate navigators/stacks, a
  // route only exists in whichever one(s) actually declare it. Same
  // shape, same onConfirm contract either way.
  LocationPin: {
    initialCoordinates: import('../location/geocoding').Coordinates | null;
    onConfirm: (coordinates: import('../location/geocoding').Coordinates, district: string, addressLine: string | null) => void;
  };
};

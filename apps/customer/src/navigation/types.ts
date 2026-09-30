// Central param-list definitions — one place to see every screen and what it needs.

import type { CartItem } from '../store/useCartStore';

export type AuthStackParamList = {
  Login: undefined;
  OtpVerification: { phone: string };
};

export type AppStackParamList = {
  // One-time (per session, until a saved location exists) flow between login
  // and Home — see src/screens/location/README.md for the full sequence.
  LocationPermission: undefined;
  // Reached from Home's own "Delivering to" header tap — the intermediate
  // "search / use current location / add new address / saved / recently
  // searched" picker that used to skip straight to the map (LocationSearch)
  // with no way to reuse a saved address or a past search. Every row here
  // still ends up at LocationSearch, just pre-filled instead of starting
  // from the default zone center.
  SelectLocation: undefined;
  // Single screen now — search bar + live map + confirm sheet all in one
  // (LocationSearchScreen.tsx), no separate MapConfirm page to navigate to.
  // latitude/longitude/addressLabel/city are an optional starting point
  // (LocationPermissionScreen passes real GPS coords straight in so the map
  // opens already centered there); omitted means the map opens on the
  // default zone center and waits for a search or the on-map "current
  // location" pill instead. intent: 'address-book' makes "Confirm location"
  // push to AddressForm (a real saved address) instead of its default
  // behavior (set useLocationStore's browsing location and reset to Home).
  LocationSearch:
    | { latitude?: number; longitude?: number; addressLabel?: string; city?: string; intent?: 'address-book' }
    | undefined;
  // Real map pin + reverse-geocoded starting text for a new saved address
  // — reached only via LocationSearch's own intent='address-book' branch,
  // never directly. AddressFormScreen.tsx collects the rest (recipient
  // name/phone, landmark, label, delivery instructions) and POSTs the real
  // address (backend/src/routes/addresses.ts).
  AddressForm: { latitude: number; longitude: number; addressLabel: string; city: string };
  // The real address book — list of saved addresses (GET /addresses) with
  // a tap-to-select and a "+ Add new address" entry point into the flow
  // above. Reached from Checkout's own "Change" affordance.
  AddressList: undefined;
  Home: undefined;
  Categories: undefined;
  Search: undefined;
  Store: undefined;
  Purchase: undefined;
  Profile: undefined;
  CategoryDetail: { categoryId: string; label: string };
  BreakfastEssentials: undefined;
  KitchenEssentials: undefined;
  SnacksAndDrinks: undefined;
  LocalPantryBrand: { brandId: string };
  StoreDetail: { storeId: string; storeName: string };
  Cart: undefined;
  Checkout: undefined;
  // Real failure/timeout destination for the UPI Intent flow (below) — a
  // Standard Checkout (card/online) failure is still handled inline on
  // Checkout itself (Razorpay's own SDK already shows the failure inside
  // its bundled UI before ever returning control here), so only the async
  // UPI-app path — which has no such built-in UI — routes here.
  PaymentStatus: { amount: number };
  // The real waiting room for the UPI Intent flow (CheckoutScreen's own
  // handlePay, payments/pollOrderPaid.ts) — launching a UPI app and
  // getting control back only means the customer finished interacting
  // with it, never that the payment settled (backend/src/payments/
  // webhook.ts is the only real source of truth). This screen owns that
  // wait: a live countdown matching pollOrderPaid's own real timeout
  // budget, replacing itself with Receipt on confirmed success or
  // PaymentStatus on timeout — never both, and never Receipt on anything
  // but a confirmed webhook.
  //
  // Everything Receipt needs is threaded straight through as params
  // (same shape CheckoutScreen's own goToReceipt already assembles for
  // every other payment path) since this screen — not CheckoutScreen —
  // is what actually navigates to Receipt for this one path, and the
  // cart must stay uncleared until payment is actually confirmed (a
  // timeout leaves the order sitting unpaid, same as before this screen
  // existed — jobs/expireUnpaidOrders.ts cleans it up backend-side; the
  // customer's cart itself should still be there to retry with).
  PaymentProcessing: {
    target: { orderId: string } | { tripId: string };
    appName: string;
    amount: number;
    order: {
      orderId: string;
      orderNumber: string;
      placedAt: string;
      avgPrepMinutes: number | null;
    };
    items: CartItem[];
    deliveryAddress: string;
    isTrip?: boolean;
  };
  // orderId is the real backend orders.id (UUID, from POST /orders) —
  // used only for navigation (TrackOrder's own real lookup), never shown.
  // orderNumber is the real, human-facing orders.order_number ("FLK-100042",
  // backend/src/routes/orders.ts's own note on why this exists) — what
  // ReceiptScreen actually displays, so it matches exactly what the
  // partner app and TrackOrderScreen show for the same order instead of a
  // locally-sliced fragment of the UUID that looked similar but wasn't the
  // same identifier at all.
  // placedAt/avgPrepMinutes — real order.placed_at + the store's
  // avg_prep_minutes (POST /orders's own response, backend's note) so
  // ReceiptCard can show a real estimated-delivery time without a second
  // fetch, same ETA math TrackOrderScreen uses (utils/estimateDelivery.ts).
  Receipt: {
    orderId: string;
    orderNumber: string;
    amount: number;
    items: CartItem[];
    paymentMethodLabel: string;
    placedAt: string;
    avgPrepMinutes: number | null;
    // Set when orderId is actually a real trips.id (a multi-store
    // checkout, CheckoutScreen's own isMultiStore branch) rather than a
    // real orders.id — TrackOrderScreen reads this to know whether to
    // call api/trips.ts's fetchTrip or api/orders.ts's fetchOrder.
    // Undefined (not false) for every single-store order, same as before
    // this field existed.
    isTrip?: boolean;
    // The real addresses row this order was actually placed against
    // (CheckoutScreen's own selectedAddress at the moment Pay was tapped)
    // — not the ambient useLocationStore label ReceiptScreen used to fall
    // back to, which could disagree with the order's real address if the
    // customer changed their default address after paying but before this
    // screen rendered, or simply never matched a multi-address account's
    // current GPS-derived location at all.
    deliveryAddress: string;
  };
  TrackOrder: { orderId: string; paymentMethodLabel: string; isTrip?: boolean };
  Wishlist: undefined;
  ShoppingList: undefined;
  // Invite/referral tracking only — no credit/discount payout (backend's
  // routes/referrals.ts own note on why: that would be a loyalty/rewards
  // mechanic, explicitly out of scope until MVP validates).
  Referral: undefined;
  // Generic "not built yet" destination — see ComingSoonScreen.tsx's own
  // note. Both params optional so `navigation.navigate('ComingSoon')` with
  // no args still works, falling back to that screen's own generic copy.
  ComingSoon: { title?: string; subtitle?: string } | undefined;
  // TEMP root for design iteration on UnavailableZoneScreen.tsx — see
  // AppNavigator.tsx's own note. Same screen HomeScreen.tsx renders inline
  // when isServiceable is false; registered as a real route only so it can
  // be the stack's initialRouteName without faking a real unserviceable
  // location.
  UnavailableZone: undefined;
  // TEMP root for design iteration on ErrorScreen.tsx — see
  // AppNavigator.tsx's own note.
  ErrorPage: undefined;
};

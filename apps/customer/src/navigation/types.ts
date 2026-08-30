// Central param-list definitions — one place to see every screen and what it needs.

import type { CartItem } from '../store/useCartStore';

export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  OtpVerification: { phone: string };
};

export type AppStackParamList = {
  // One-time (per session, until a saved location exists) flow between login
  // and Home — see src/screens/location/README.md for the full sequence.
  LocationPermission: undefined;
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
  StoreDetail: { storeId: string; storeName: string };
  Cart: undefined;
  Checkout: undefined;
  // Failure only — a successful payment goes straight to Receipt instead
  // (CheckoutScreen.tsx's own handlePay/runOnlineCheckout already show a
  // real "Payment not completed" alert with a retry option inline, so
  // nothing navigates here yet). Kept ready for a fuller dedicated failure
  // screen later.
  PaymentStatus: { amount: number };
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
  };
  TrackOrder: { orderId: string; paymentMethodLabel: string };
};

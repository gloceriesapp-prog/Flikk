import type { ApiAddress } from '../api/addresses';
// Central param-list definitions — one place to see every screen and what it needs.

import type { CartItem } from '../store/useCartStore';
import type { PaymentMethod } from '../payments/paymentMethod';
import type { FestivalCollectionKey } from '../screens/home/festival/collections/useFestivalCollection';

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
    // fromGps: the coordinates are the device's own GPS position, so the
    // pin keeps following the live blue dot as the fix sharpens.
    | { latitude?: number; longitude?: number; addressLabel?: string; city?: string; intent?: 'address-book'; fromGps?: boolean }
    | undefined;
  // Real map pin + reverse-geocoded starting text for a new saved address
  // — reached only via LocationSearch's own intent='address-book' branch,
  // never directly. AddressFormScreen.tsx collects the rest (recipient
  // name/phone, landmark, label, delivery instructions) and POSTs the real
  // address (backend/src/routes/addresses.ts).
  // `address` set = edit that saved address (AddressList's Edit) instead of creating one.
  AddressForm: { latitude: number; longitude: number; addressLabel: string; city: string; address?: ApiAddress };
  // The real address book — list of saved addresses (GET /addresses) with
  // a tap-to-select and a "+ Add new address" entry point into the flow
  // above. Reached from Checkout's own "Change" affordance.
  AddressList: undefined;
  Home: undefined;
  HomeCategory: { tabId: string };
  HomeContentCollection: { tabKey: 'grocery' | 'fresh' | 'regional'; sectionId: string; itemId?: string };
  Categories: undefined;
  Search: undefined;
  Store: undefined;
  Purchase: undefined;
  Profile: undefined;
  CategoryDetail: { categoryId: string; label: string };
  BreakfastEssentials: undefined;
  KitchenEssentials: undefined;
  FestivalCollection: { collection: FestivalCollectionKey };
  SnacksAndDrinks: undefined;
  LocalPantryBrand: { brandId: string };
  FreshCategory: { categoryId: string };
  EverydayVegetables: undefined;
  FruitFavourites: undefined;
  HomeGrownProduce: undefined;
  RegionalCategory: { categoryId: string };
  CoconutOilCollection: undefined;
  StoreDetail: { storeId: string; storeName: string };
  // upiVpa: the UPI ID verified on PaymentMethod (only with 'upi_id'). Kept
  // in navigation state only — never persisted remotely.
  Cart: { selectedPaymentMethod?: PaymentMethod; upiVpa?: string } | undefined;
  PaymentMethod: { selectedMethod: PaymentMethod | null; source?: 'profile'; upiVpa?: string };
  // Real failure/timeout destination for the UPI Intent flow (below) — a
  // Standard Checkout (card/online) failure is still handled inline on
  // Checkout itself (Cashfree's own checkout already shows the failure inside
  // its hosted UI before ever returning control here), so only the async
  // UPI-app path — which has no such built-in UI — routes here.
  CheckoutAttemptRecovery: undefined;
  PaymentRecovery: { target: import('../api/payments').PaymentTarget };
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
    paymentMethod: PaymentMethod;
    amount: number;
    order: {
      orderId: string;
      orderNumber: string;
      placedAt: string;
      avgPrepMinutes: number | null;
      estimatedDeliveryMinutes?: number | null;
      estimatedDeliveryAt?: string | null;
    };
    items: CartItem[];
    deliveryAddress: string;
    isTrip?: boolean;
    // UPI collect: the customer must approve a request inside their UPI app
    // before this time (ISO). Drives the countdown and the poll deadline.
    collect?: { vpa: string; expiresAt: string | null };
  };
  // orderId is the real backend orders.id (UUID, from POST /orders) —
  // used only for navigation (TrackOrder's own real lookup), never shown.
  // orderNumber is the real, human-facing orders.order_number ("FLK-100042",
  // backend/src/routes/orders.ts's own note on why this exists) — what
  // ReceiptScreen actually displays, so it matches exactly what the
  // partner app and TrackOrderScreen show for the same order instead of a
  // locally-sliced fragment of the UUID that looked similar but wasn't the
  // same identifier at all.
  // Receipts use the delivery snapshot returned at placement, shared
  // with tracking. avgPrepMinutes remains legacy metadata only.
  Receipt: {
    orderId: string;
    orderNumber: string;
    amount: number;
    items: CartItem[];
    paymentMethodLabel: string;
    placedAt: string;
    avgPrepMinutes: number | null;
    estimatedDeliveryMinutes?: number | null;
    estimatedDeliveryAt?: string | null;
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
  OrderSummary: { orderId: string; isTrip?: boolean };
  Support: {target?:import('../features/customer-care/api').SupportTarget;category?:import('../features/customer-care/api').IssueCategory} | undefined;
  Notifications: undefined;
  AboutGloceries: undefined;
  Faq: undefined;
  SupportTicket: {ticketId:string};
  MyRefunds: undefined;
  RefundDetail: {kind:'order'|'trip';refundId:string};
  Wishlist: undefined;
  // Invite/referral tracking only — no credit/discount payout (backend's
  // routes/referrals.ts own note on why: that would be a loyalty/rewards
  // mechanic, explicitly out of scope until MVP validates).
  Referral: undefined;
  AccountPrivacy: undefined;
};

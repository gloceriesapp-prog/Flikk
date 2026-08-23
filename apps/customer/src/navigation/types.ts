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
  LocationSearch: undefined;
  MapConfirm: { latitude: number; longitude: number; addressLabel: string; city: string };
  Home: undefined;
  Categories: undefined;
  Search: undefined;
  Store: undefined;
  Purchase: undefined;
  CategoryDetail: { categoryId: string; label: string };
  StoreDetail: { storeId: string; storeName: string };
  Cart: undefined;
  Checkout: undefined;
  // Failure only — a successful payment goes straight to Receipt instead
  // (see PaymentProcessingSheet.tsx / CheckoutScreen.tsx). Nothing
  // navigates here yet; kept ready for when a real Razorpay failure needs
  // somewhere to land.
  PaymentStatus: { amount: number };
  Receipt: { amount: number; items: CartItem[]; paymentMethodLabel: string };
  TrackOrder: { orderId: string; paymentMethodLabel: string };
};

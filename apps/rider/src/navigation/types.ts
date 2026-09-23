// Central param-list definitions — one place to see every screen and what
// it needs. AuthStackParamList (no session) is separate from
// AppStackParamList (real session) — RootNavigator renders one or the
// other, never both, same split as the other two RN apps.

// The onboarding wizard's accumulating state — each step fills in more of
// it and passes the whole thing forward as a route param, same threaded-
// object pattern apps/partner's own StoreDraft uses (this stack is never
// deep-linked, so a plain param object is a smaller diff than a store
// slice). Photo fields hold the real private-bucket object PATH returned
// by uploadRiderDocumentPhoto, never a raw base64 or public URL.
export interface RiderDraft {
  fullName: string;
  dateOfBirth: string; // "YYYY-MM-DD", or '' until entered
  // Optional face photo for the Profile avatar — private-bucket object PATH
  // like aadhaar/dl, never gates submission.
  profilePhotoUrl: string | null;
  // Structured home address — collected as separate fields (industry
  // standard), composed into one canonical string for the backend's single
  // home_address column at save time (utils/address.ts). Landmark is the
  // only optional part.
  houseNumber: string;
  street: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  aadhaarNumber: string;
  aadhaarPhotoUrl: string | null;
  dlNumber: string;
  dlPhotoUrl: string | null;
  vehicleType: 'bicycle' | 'scooter' | 'motorcycle' | null;
  vehicleNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
}

export type AuthStackParamList = {
  Login: undefined;
  OtpVerification: { phone: string };
  OnboardingIntro: { draft?: RiderDraft } | undefined;
  PersonalDetails: { draft: RiderDraft };
  IdentityVerification: { draft: RiderDraft };
  VehicleDetails: { draft: RiderDraft };
  EmergencyContact: { draft: RiderDraft };
  ReviewSubmit: { draft: RiderDraft };
};

// Real @react-navigation/bottom-tabs, not a flat stack with a per-screen
// custom bar — a flat stack meant switching tabs re-mounted the whole
// screen (navbar included) under the stack's own push transition, so the
// bar visibly slid/moved instead of staying fixed while only the content
// changed. TabNavigator.tsx owns the fixed tab bar (still the same custom
// floating glass pill via BottomNavBar, just driven by bottom-tabs'
// tabBar prop instead of rendered per-screen) and is nested as one screen
// ("Tabs") inside AppStackParamList below, so OrderDetail can still push
// on top without the tab bar.
export type AppTabParamList = {
  Home: undefined;
  Orders: undefined;
  Earnings: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  OrderDetail: { orderId: string };
  RiderDocuments: undefined;
};

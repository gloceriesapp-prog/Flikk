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
  Notifications: undefined;
  Earnings: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  // Full-screen store-pickup nav (map + external maps hand-off) — shown
  // when a rider taps an 'assigned' active card, before pickup is confirmed.
  // OrderDetail owns everything from pickup-confirm onward.
  PickupNavigation: { orderId: string };
  // Pickup verification (QR placeholder + item checklist) — reached from the
  // pickup-nav "I've arrived" button. Owns the real assigned→picked_up write.
  PickupVerification: { orderId: string };
  // Full-screen drop-leg nav (map + external maps hand-off) — the customer
  // twin of PickupNavigation, shown once the order is picked_up. Advances to
  // arrived_at_customer, then DeliveryProof owns the OTP-verified delivery.
  DeliveryNavigation: { orderId: string };
  // Delivery-proof step — reached from DeliveryNavigation's "I've arrived"
  // slide (order is now arrived_at_customer). Single 4-digit OTP box that
  // auto-validates (no button); a correct code fires the delivered write and
  // replaces to DeliveryComplete.
  DeliveryProof: { orderId: string };
  // Delivery-complete celebration — tick animation + the earnings receipt for
  // the just-finished delivery (base/distance/incentive + today's total),
  // then "Get next order" back to the tabs. Terminal step of the drop flow.
  DeliveryComplete: { orderId: string };
  OrderDetail: { orderId: string };
  RiderDocuments: undefined;
  // Weekly working-hours schedule + the auto-online master switch. Reached
  // from Profile's "Working hours" row.
  Availability: undefined;
  // Weekly payout history — the per-payout complement to the Earnings tab.
  // Reached from Profile's "Payout history" row.
  PayoutHistory: undefined;
  // Help & support: admin-configured contacts + the rider's support requests.
  // compose opens the new-request form directly (Profile's "Report a problem").
  Support: { compose?: boolean } | undefined;
  SupportTicket: { ticketId: string };
};

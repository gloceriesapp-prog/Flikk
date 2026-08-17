// Central param-list definitions — one place to see every screen and what it needs.

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
  MapConfirm: { latitude: number; longitude: number; addressLabel: string };
  Home: undefined;
  Categories: undefined;
  Search: undefined;
};

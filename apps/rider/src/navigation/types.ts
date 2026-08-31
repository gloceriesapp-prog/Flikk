// Central param-list definitions — one place to see every screen and what
// it needs. AuthStackParamList (no session) is separate from
// AppStackParamList (real session) — RootNavigator renders one or the
// other, never both, same split as the other two RN apps.

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  OtpVerification: { phone: string };
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
  // Optional initialRange — Home's WeeklyEarningsStrip jumps straight to
  // the week tab instead of always landing on Today, which EarningsScreen
  // itself still defaults to when opened via the tab bar directly (no
  // params).
  Earnings: { initialRange?: 'today' | 'week' | 'all' } | undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  OrderDetail: { orderId: string };
};

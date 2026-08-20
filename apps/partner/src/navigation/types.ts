// Central param-list definition — one place to see every screen and what it
// needs. Bottom-tab structure per specs/02-partner-app/screens.md: Orders /
// Catalog / Payouts. Orders (the order queue, P2) doubles as this app's home
// screen — there's no separate "Home" tab, see that spec's own note.

export type AppStackParamList = {
  Orders: undefined;
  Catalog: undefined;
  Payouts: undefined;
  // Order detail (P3) — reached from OrderCard's "View Order". Only an id
  // is passed, not the whole order object; the screen reads the live
  // order from ../store/useOrdersStore.ts (see that file's own note on why).
  OrderDetail: { orderId: string };
};

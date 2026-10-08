// What's left here is real, standing config — not placeholder records.
// Every actual data table (orders, stores, riders, applications, reviews,
// promo codes, customers) now reads from Supabase; the fixed fake-record
// arrays that used to live in this file (PLACEHOLDER_ORDERS,
// PLACEHOLDER_APPLICATIONS, PLACEHOLDER_PRODUCT_PERFORMANCE,
// PLACEHOLDER_ORDER_STATS) were removed once every screen that read them
// had a real data source, along with the two dashboard widgets
// (RecentOrdersWidget, OrdersChart) that only ever rendered them and were
// never actually wired into a page.

export const ZONE_NAME = 'Kaup, Udupi';

// Threshold past which an order counts as "needs attention" on the Home
// snapshot — no real SLA config exists yet, this is a reasonable founder
// default until a real one is defined.
export const ATTENTION_THRESHOLD_MINUTES = 20;

// Admin-defined preset list for Product.freshnessTag — a store owner
// picks one of these, they don't type free text, so the customer app's
// ProductCard ribbon (apps/customer/src/screens/home/products/ProductCard.tsx)
// never ends up with a dozen near-duplicate strings across stores. "None"
// isn't a real option here — omit freshnessTag entirely for that.
export const FRESHNESS_TAG_PRESETS = ["Today's Fresh", 'Fresh Catch', 'Farm Fresh', 'Fresh Baked'];

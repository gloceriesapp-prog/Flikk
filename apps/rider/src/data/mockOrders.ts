// Dev-only preview data now — useRiderOrdersStore.ts's real order source
// is api/orders.ts's fetchAssignments (backend/src/routes/rider.ts's real
// GET /assignments). This file is only still used by loadSampleData/
// loadSampleWeek, both gated behind __DEV__ at their call sites
// (HomeScreen.tsx/EarningsScreen.tsx) — never a real beta rider's actual
// order queue.
//
// Names/addresses are grounded in the real launch zone (CLAUDE.md: Kaup,
// outer Udupi) rather than generic placeholder text like "Store A" —
// still fabricated data (no real backend to read from), but plausible
// for what this app will actually show once one exists.

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface OrderItemLine {
  name: string;
  quantity: number;
  unit?: string;
}

export interface RiderOrder {
  id: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  // Real stores.phone (backend /assignments select) — the pickup nav
  // screen's "Call store" dials this; undefined when the store row has no
  // number, in which case the button falls back to an Alert.
  storePhone?: string;
  storeCoords: Coordinates;
  customerName: string;
  customerAddress: string;
  // Drop-nav extras — a nearby landmark and a free-text delivery instruction
  // ("leave at door", "call on arrival"). No backend column for either yet
  // (orders has no delivery-note field), so real assignments leave these
  // undefined and DeliveryNavigationScreen falls back to placeholder copy.
  // ponytail: drop the fallback once the customer app collects a real note.
  landmark?: string;
  deliveryNote?: string;
  customerCoords: Coordinates;
  customerPhone: string;
  itemCount: number;
  // Plausible kirana-store line items (mock, same reasoning as this
  // file's own header note — no real backend order to read the actual
  // cart from yet). Quantities always sum to itemCount, so the two never
  // disagree on-screen.
  items: OrderItemLine[];
  // baseFare + distanceFare + surge always sums to payout — shown as an
  // itemized breakup (OrderDetailScreen/EarningsScreen) instead of one bare
  // number, since an unexplained payout figure is the single biggest
  // driver of gig-app 1-star reviews.
  payout: number;
  baseFare: number;
  distanceFare: number;
  surge: number;
  distanceKm: number;
  status: 'assigned' | 'picked_up' | 'arrived_at_customer' | 'delivered' | 'cancelled';
  placedAt: string;
  deliveredAt?: string;
  cancelReason?: string;
  // Set only once delivered (generateMockRating in useRiderOrdersStore) —
  // stands in for a real post-delivery customer rating.
  customerRating?: number;
  // Also set only on delivery, same as customerRating — a real tip is a
  // customer action that happens after handoff, never known at assignment
  // time, so this has no business being generated alongside payout in
  // generateMockOrder below. Separate from payout on purpose: a tip is the
  // customer's own money on top of the fare, not part of what the delivery
  // itself earned — shown as its own line everywhere payout is broken down.
  tip?: number;
  // Real orders.trip_id (backend/migrations/014_trips.sql) — set only when
  // this order is one leg of a multi-store checkout. Multiple RiderOrders
  // can share the same tripId: same customer/drop address, different
  // store/pickup per leg. OrdersScreen groups siblings into one job card;
  // OrderDetailScreen shows "stop X of N" and moves every sibling leg
  // through pickup/delivery together (see that screen's own note) rather
  // than treating them as N unrelated deliveries that happen to arrive at
  // the same address.
  tripId?: string;
  // Real orders.payment_method (backend GET /rider/assignments). 'cod' means
  // the rider collects cashToCollect in cash at the door — the order total,
  // or the whole trip total on every leg of a trip (not per leg).
  paymentMethod: 'cod' | 'online';
  cashToCollect: number;
}

const STORE_NAMES = ['Ganesh Kirana Store', 'Suvarna Supermarket', 'Kaup Fresh Mart', 'Udupi Daily Needs', 'Anantha Provision Store'];
const STORE_AREAS = ['Kaup Beach Road', 'Near Kaup Bus Stand', 'Padubidri Road', 'Kaup Market Junction'];
const CUSTOMER_NAMES = ['Deepak Shetty', 'Vidya Rao', 'Prakash Kamath', 'Shwetha Pai', 'Naveen Kotian', 'Anitha Bhat'];
const CUSTOMER_AREAS = ['near St. Mary\'s Church, Kaup', 'Kaup Lighthouse Road', 'behind Kaup Post Office', 'Katapadi Road, Kaup'];

let orderSequence = 1001;

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomPhone(): string {
  return `+91${9000000000 + Math.floor(Math.random() * 999999999)}`.slice(0, 13);
}

// Kaup/outer Udupi — this app's only launch zone (CLAUDE.md). Real
// addresses have no real geocoded coordinates behind them (no backend to
// look them up from), so store/customer pins are placed with a small
// random offset from this center — plausible positions for a delivery
// map, not actually where "Kaup Beach Road" sits.
const ZONE_CENTER: Coordinates = { latitude: 13.2167, longitude: 74.7469 };

function randomNearbyCoords(): Coordinates {
  // ~0.01-0.03 deg offset ≈ 1-3km, matching distanceKm's own range below.
  const jitter = () => (Math.random() - 0.5) * 0.03;
  return { latitude: ZONE_CENTER.latitude + jitter(), longitude: ZONE_CENTER.longitude + jitter() };
}

const BASE_FARE = 15;

// Real kirana/grocery staples — same "plausible, not generic placeholder"
// bar this file's own header note holds every mock field to.
const ITEM_POOL = [
  'Toor Dal 1kg',
  'Sunflower Oil 1L',
  'Basmati Rice 5kg',
  'Amul Milk 500ml',
  'Tomatoes 1kg',
  'Onions 1kg',
  'Maggi Noodles',
  'Britannia Bread',
  'Parle-G Biscuits',
  'Tata Salt 1kg',
  'Red Chilli Powder 200g',
  'Bananas (dozen)',
  'Curd 400g',
  'Eggs (6 pack)',
  'Potatoes 1kg',
  'Tea Powder 250g',
];

// Picks enough distinct items for a plausible cart and spreads the given
// total quantity across them — always sums back to exactly `itemCount`,
// so the summary line and the expanded list can never disagree.
function generateOrderItems(itemCount: number): OrderItemLine[] {
  const lineCount = Math.min(itemCount, 2 + Math.floor(Math.random() * 3));
  const shuffled = [...ITEM_POOL].sort(() => Math.random() - 0.5).slice(0, lineCount);
  const base = Math.floor(itemCount / lineCount);
  const remainder = itemCount - base * lineCount;
  return shuffled.map((name, i) => ({ name, quantity: base + (i < remainder ? 1 : 0) }));
}

export function generateMockOrder(): RiderOrder {
  orderSequence += 1;
  const distanceKm = Number((1 + Math.random() * 3.5).toFixed(1));
  const distanceFare = Math.round(distanceKm * 8);
  // Surge fires ~1 in 4 orders — a flat "sometimes there's more" is enough
  // for a mock; a real surge model reads live demand, out of scope here.
  const surge = Math.random() < 0.25 ? 10 : 0;
  const itemCount = 2 + Math.floor(Math.random() * 8);

  return {
    id: `mock-order-${orderSequence}-${Date.now()}`,
    orderNumber: `FLK-${orderSequence}`,
    storeName: pick(STORE_NAMES),
    storeAddress: pick(STORE_AREAS),
    storeCoords: randomNearbyCoords(),
    customerName: pick(CUSTOMER_NAMES),
    customerAddress: pick(CUSTOMER_AREAS),
    customerCoords: randomNearbyCoords(),
    customerPhone: randomPhone(),
    itemCount,
    items: generateOrderItems(itemCount),
    payout: BASE_FARE + distanceFare + surge,
    baseFare: BASE_FARE,
    distanceFare,
    surge,
    distanceKm,
    status: 'assigned',
    placedAt: new Date().toISOString(),
    paymentMethod: 'cod',
    cashToCollect: 100 + itemCount * 40,
  };
}

// Weighted toward 4-5 stars — matches what a genuinely working delivery
// flow should produce; a real rating comes from the customer app, not a
// coin flip, but the distribution shape is worth mirroring even mocked.
const RATING_POOL = [5, 5, 5, 4, 4, 4, 3, 5, 4, 5];

export function generateMockRating(): number {
  return pick(RATING_POOL);
}

// ~45% of deliveries get a tip, ₹10-60 — plausible spread for this zone's
// payout range, not a tuned real figure.
export function generateMockTip(): number {
  if (Math.random() > 0.45) return 0;
  return 10 + Math.floor(Math.random() * 6) * 10;
}

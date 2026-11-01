// Shared rider order types. The name is historical: this file once also held
// on-device sample-order generators; those were removed before release, and
// every order now comes from GET /rider/assignments (api/orders.ts).

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
  // Drop-nav extras — the address's landmark and the customer's delivery
  // instructions (addresses.landmark / addresses.delivery_instructions via
  // GET /rider/assignments). Undefined when the customer gave none, and
  // DeliveryNavigationScreen then hides that row.
  landmark?: string;
  deliveryNote?: string;
  customerCoords: Coordinates;
  customerPhone: string;
  itemCount: number;
  // Order lines from the backend; quantities sum to itemCount.
  items: OrderItemLine[];
  // baseFare + extraStopFare + surge always sums to payout — shown as an
  // itemized breakup (OrderDetailScreen/DeliveryCompleteScreen) instead of
  // one bare number. Real values come from the backend's rider_payout split
  // (the admin pay rule, or the recorded earning once delivered); on a trip
  // every leg carries the whole trip's figures (utils/payout.ts).
  payout: number;
  baseFare: number;
  extraStopFare: number;
  surge: number;
  distanceKm: number;
  status: 'assigned' | 'picked_up' | 'arrived_at_customer' | 'delivered' | 'cancelled';
  placedAt: string;
  deliveredAt?: string;
  cancelReason?: string;
  // The customer's post-delivery rating, when one exists.
  customerRating?: number;
  // Set only after delivery. Separate from payout on purpose: a tip is the
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
  // Taken while the store was still packing (backend status 'placed'):
  // pickup waits until the store marks it packed. readyAt is the store's
  // expected finish time (epoch ms). Absent = ready to collect.
  packing?: boolean;
  readyAt?: number | null;
}

// Dev only: the real Track Order screen playing a whole sample order on
// real Udupi streets, for UI work. It loops through:
//   1. placed (~30 s): store and home pins, no rider yet;
//   2. rider assigned, heading to the store (pickup leg);
//   3. picked up, heading to the customer (drop leg), with a wrong turn the
//      server re-routes from, all the way to the door;
//   4. delivered (~15 s). While mounted it answers only this sample order's requests
// itself; every other request still goes to the server. Registered under
// __DEV__ in AppNavigator.
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { fetchPublicCatalogue } from '../../api/products';
import type { Product } from '../home/products/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/types';
import { TrackOrderScreen } from './TrackOrderScreen';
import { TrackingPreviewContext } from './state/trackingPreview';

const PREVIEW_ID = '00000000-0000-4000-8000-00000000beef';
// Udupi, shop to customer, on real streets (OpenStreetMap routing, sampled
// once). PLANNED is the route the server worked out at pickup (version 1).
// The rider instead takes a different real street (RIDDEN, ~100 m per
// ping): it shares the first DIVERGE points, then leaves the planned road.
// After two fixes in a row off it, the server re-routes (version 2): a new
// road route from where the rider is, all the way to the customer, which
// the rider then follows to the door. Then the ride starts again.
const toPoint = ([lat, lng]: number[]) => ({ lat: lat!, lng: lng! });
const PLANNED = [
  [13.340718, 74.741844], [13.340377, 74.741139], [13.339865, 74.741128], [13.339218, 74.740795],
  [13.339155, 74.739975], [13.339105, 74.739168], [13.33988, 74.739187], [13.340785, 74.739188],
  [13.341654, 74.738978], [13.342354, 74.738877], [13.342995, 74.738734], [13.34356, 74.738638],
  [13.344394, 74.738591], [13.344984, 74.738523], [13.345556, 74.738565], [13.345286, 74.739315],
  [13.345056, 74.739956], [13.344865, 74.740545], [13.344196, 74.742764], [13.343953, 74.743638],
  [13.343706, 74.744539], [13.343756, 74.745436], [13.343943, 74.746248], [13.344044, 74.74681],
  [13.343981, 74.747474], [13.344068, 74.748023], [13.344694, 74.749291], [13.344969, 74.749913],
  [13.345194, 74.750504], [13.345347, 74.751117], [13.34558, 74.75179], [13.347518, 74.751556],
  [13.348256, 74.751465], [13.348984, 74.751377], [13.349888, 74.751276], [13.35068, 74.751186],
  [13.351316, 74.751104], [13.351908, 74.751068], [13.353711, 74.75107], [13.354802, 74.750983],
  [13.354655, 74.751074], [13.354397, 74.751937], [13.354522, 74.752597], [13.354653, 74.753174],
  [13.354835, 74.754297], [13.354531, 74.755084], [13.354621, 74.755654], [13.353819, 74.755713],
  [13.352615, 74.755819],
].map(toPoint);
const RIDDEN = [
  [13.340718, 74.741844], [13.34004, 74.741227], [13.339218, 74.740795], [13.339105, 74.739168],
  [13.340259, 74.739207], [13.341218, 74.739064], [13.342354, 74.738877], [13.343288, 74.738679],
  [13.344394, 74.738591], [13.345399, 74.738522], [13.345286, 74.739315], [13.344865, 74.740545],
  [13.344196, 74.742764], [13.345386, 74.742934], [13.34562, 74.743807], [13.346993, 74.743952],
  [13.348112, 74.744006], [13.348976, 74.744177], [13.350513, 74.74457], [13.351222, 74.744898],
  [13.352186, 74.745454], [13.352481, 74.746152], [13.352348, 74.747446], [13.351438, 74.747631],
  [13.351317, 74.748614], [13.351472, 74.749749], [13.351808, 74.750732], [13.353711, 74.75107],
  [13.354802, 74.750983], [13.354548, 74.751459], [13.354522, 74.752597], [13.354709, 74.753633],
  [13.354421, 74.754506], [13.354621, 74.755654], [13.353673, 74.755757], [13.352615, 74.755819],
].map(toPoint);
const DIVERGE = 13;
const PICKUP = PLANNED[0]!;
const DESTINATION = PLANNED[PLANNED.length - 1]!;
// Second fix off the planned road: when the server re-routes.
const REROUTE_AT = DIVERGE + 1;

// Rider's road to the store when assigned (pickup leg), ~100 m per ping.
const TO_STORE = [
  [13.346827, 74.732966], [13.347478, 74.733337], [13.346982, 74.734686], [13.346626, 74.735586],
  [13.345941, 74.737561], [13.345556, 74.738565], [13.344394, 74.738591], [13.343288, 74.738679],
  [13.342354, 74.738877], [13.341218, 74.739064], [13.340259, 74.739207], [13.339105, 74.739168],
  [13.339218, 74.740795], [13.339865, 74.741128], [13.340549, 74.741494], [13.340718, 74.741844],
].map(toPoint);

const PING_MS = 5_000;
const PLACED_MS = 30_000;
const PICKUP_MS = TO_STORE.length * PING_MS;
const DROP_MS = RIDDEN.length * PING_MS;
const DELIVERED_MS = 15_000;
const LOOP_MS = PLACED_MS + PICKUP_MS + DROP_MS + DELIVERED_MS;
type Stage = { name: 'placed' } | { name: 'pickup'; ping: number } | { name: 'drop'; ping: number } | { name: 'delivered' };
function stageAt(elapsed: number): Stage {
  let t = elapsed % LOOP_MS;
  if (t < PLACED_MS) return { name: 'placed' };
  t -= PLACED_MS;
  if (t < PICKUP_MS) return { name: 'pickup', ping: Math.floor(t / PING_MS) };
  t -= PICKUP_MS;
  if (t < DROP_MS) return { name: 'drop', ping: Math.floor(t / PING_MS) };
  return { name: 'delivered' };
}

// Set to 'delivered' to hold the preview on the finished order (UI work on
// the delivered state); 'loop' plays the whole ride.
const PREVIEW_HOLD: 'loop' | 'delivered' = 'delivered';
const DELIVERED_AT = PLACED_MS + PICKUP_MS + DROP_MS + 1;

const asRoute = (points: { lat: number; lng: number }[]) => points.map(p => ({ latitude: p.lat, longitude: p.lng }));
const STAGE_NUMBER = { placed: 0, pickup: 1, drop: 2, delivered: 3 } as const;

function previewOrder(elapsed: number) {
  const now = Date.now();
  const stage = stageAt(elapsed);
  const loop = Math.floor(elapsed / LOOP_MS);
  // Times since this loop's order was placed, so labels and ETA stay right.
  const placedAt = now - (elapsed % LOOP_MS);
  const at = (ms: number) => new Date(placedAt + ms).toISOString();
  const assigned = stage.name !== 'placed';
  const pickedUp = stage.name === 'drop' || stage.name === 'delivered';
  return {
    id: PREVIEW_ID, order_number: 'GLO-1234-5678', store_id: 'preview-store',
    status: stage.name === 'placed' || stage.name === 'pickup' ? 'packed' : stage.name === 'drop' ? 'out_for_delivery' : 'delivered',
    live_revision: loop * 4 + STAGE_NUMBER[stage.name] + 1,
    rider_id: assigned ? 'preview-rider' : null,
    estimated_delivery_minutes: 20, estimated_delivery_at: at(20 * 60_000),
    deliver_from: null, deliver_until: null,
    addresses: { label: 'Home', line1: 'House 12, Sri Krishna Nilaya', landmark: 'Near the temple', recipient_name: 'Nishal', recipient_phone: '+919000000000', map_address: 'Yenna Gudde, Kunjibettu, Udupi, Karnataka 576102' },
    item_total: 180, delivery_fee: 0, handling_fee: 5, commission_amount: 0, total: 185, discount_amount: 0, promo_code_id: null,
    provider_payment_id: null, payment_method: 'cod', cancel_reason: null, refund_status: 'none', provider_refund_id: null, refunded_at: null,
    placed_at: at(0), packed_at: at(10_000),
    picked_up_at: pickedUp ? at(PLACED_MS + PICKUP_MS) : null, rider_arrived_at: null,
    delivered_at: stage.name === 'delivered' ? at(PLACED_MS + PICKUP_MS + DROP_MS) : null,
    delivery_otp: stage.name === 'drop' ? '4821' : null, trip_id: null,
    order_items: sampleProducts.length ? sampleProducts.map((p, i) => ({
      id: `i${i}`, product_id: p.id, quantity: i + 1, unit_price_at_order: p.price, unit_at_order: p.weight,
      variant_id: p.defaultVariantId ?? null, products: { name: p.name, image_url: p.imageUrl ?? null, unit: p.weight },
    })) : [
      { id: 'i1', product_id: 'p1', quantity: 1, unit_price_at_order: 120, unit_at_order: '500 g', products: { name: 'Pure Natural Sunflower Oil', image_url: null, unit: '500 g' } },
      { id: 'i2', product_id: 'p2', quantity: 1, unit_price_at_order: 60, unit_at_order: '60 g', products: { name: 'Kellogg’s Chocolate Muesli', image_url: null, unit: '60 g' } },
    ],
    stores: { name: 'Sri Durga Stores', avg_prep_minutes: 8 },
    riders: assigned ? { name: 'Ravi Kumar', phone: '+919000000001', deliveries: 128 } : null,
  };
}

// What the server's rider-location endpoint answers at this moment.
function riderLocation(url: string, elapsed: number): unknown {
  const stage = stageAt(elapsed);
  const pins = { pickup: PICKUP, destination: DESTINATION, stale_after_seconds: 180 };
  const fix = (point: { lat: number; lng: number }) => ({ ...point, updated_at: new Date().toISOString(), age_seconds: 2, stale: false });
  const withRoute = url.includes('route=1');
  if (stage.name === 'pickup') {
    // Heading to the store: one saved route, rider -> store (version 1).
    return { ...pins, active: true, leg: 'pickup', route_version: 1, rider_location: fix(TO_STORE[stage.ping]!), route: withRoute ? asRoute(TO_STORE) : null };
  }
  if (stage.name === 'drop') {
    // Heading to the customer: the planned route, then (two fixes off it)
    // a new one from where the rider is, all the way to the door.
    const rerouted = stage.ping >= REROUTE_AT;
    return {
      ...pins, active: true, leg: 'drop', route_version: rerouted ? 2 : 1, rider_location: fix(RIDDEN[stage.ping]!),
      route: withRoute ? asRoute(rerouted ? RIDDEN.slice(REROUTE_AT) : PLANNED) : null,
    };
  }
  // Before a rider (pins only) and after delivery (nothing to track).
  return stage.name === 'placed'
    ? { ...pins, active: false, rider_location: null }
    : { active: false, rider_location: null, destination: null, stale_after_seconds: 180 };
}

function previewResponse(url: string, elapsed: number): unknown {
  if (url.includes('/rider-location')) return riderLocation(url, elapsed);
  const order = previewOrder(elapsed);
  if (url.includes('/live')) {
    const { order_items: _items, stores: _stores, riders: _riders, addresses: _address, ...live } = order;
    return live;
  }
  return order;
}

// Two real products from the public catalogue, so the sample order shows
// real photos and "Reorder items" fills the cart with real lines.
let sampleProducts: Product[] = [];

type Props = NativeStackScreenProps<AppStackParamList, 'TrackOrderPreview'>;

export function TrackOrderPreviewScreen({ navigation, route }: Props) {
  // Installed before the first render so the screen's first requests are
  // answered; the real fetch is put back on unmount.
  const [realFetch] = useState(() => {
    const original = global.fetch;
    const started = Date.now();
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!url.includes(PREVIEW_ID)) return original(input, init);
      const elapsed = PREVIEW_HOLD === 'delivered' ? DELIVERED_AT : Date.now() - started;
      return new Response(JSON.stringify(previewResponse(url, elapsed)), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;
    return original;
  });
  useEffect(() => () => { global.fetch = realFetch; }, [realFetch]);
  const [ready, setReady] = useState(sampleProducts.length > 0);
  useEffect(() => {
    if (ready) return;
    fetchPublicCatalogue()
      .then(products => { sampleProducts = products.filter(p => p.isAvailable !== false && !p.preorder && !p.options?.length).slice(0, 2); })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [ready]);
  if (!ready) return <View className="flex-1 items-center justify-center bg-[#F1F2F4]"><ActivityIndicator /></View>;
  // The preview can be the first screen: Back then goes Home instead of nowhere.
  const previewNavigation = { ...navigation, goBack: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')) };
  const trackProps = { navigation: previewNavigation, route: { ...route, name: 'TrackOrder', params: { orderId: PREVIEW_ID, paymentMethodLabel: 'Cash on delivery' } } };
  return (
    <TrackingPreviewContext.Provider value>
      <TrackOrderScreen {...(trackProps as unknown as NativeStackScreenProps<AppStackParamList, 'TrackOrder'>)} />
    </TrackingPreviewContext.Provider>
  );
}

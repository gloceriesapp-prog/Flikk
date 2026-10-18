import type { PartnerOrder } from './partnerApi';

// DEMO DATA — shown only when this store has zero real orders (same
// isDemo convention as the Overview page), so the Orders list/detail UI
// is never empty during setup. Timestamps are relative to "now" so "Today"
// stays correct on whatever day this renders; the instant a real order
// lands, isDemo flips false and this whole file stops being read.
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return hoursAgo(d * 24);
}

const MILK: PartnerOrder['order_items'][number]['products'] = { name: 'Amul Fresh Milk 500ml', unit: '500ml', image_url: null };
const BREAD: PartnerOrder['order_items'][number]['products'] = { name: 'Britannia Bread', unit: '400g', image_url: null };
const SALT: PartnerOrder['order_items'][number]['products'] = { name: 'Tata Salt 1kg', unit: '1kg', image_url: null };
const MAGGI: PartnerOrder['order_items'][number]['products'] = { name: 'Maggi Noodles 2-pack', unit: '2-pack', image_url: null };
const TEA: PartnerOrder['order_items'][number]['products'] = { name: 'Red Label Tea 250g', unit: '250g', image_url: null };
const ATTA: PartnerOrder['order_items'][number]['products'] = { name: 'Aashirvaad Atta 5kg', unit: '5kg', image_url: null };

const HAND_PICKED: PartnerOrder[] = [
  {
    id: 'demo-order-1',
    order_number: 'FLK-1042',
    status: 'placed',
    item_total: 265,
    delivery_fee: 20,
    commission_amount: 27,
    total: 285,
    provider_payment_id: 'demo_pay_1',
    placed_at: hoursAgo(0.3),
    packed_at: null,
    picked_up_at: null,
    delivered_at: null,
    order_items: [
      { id: 'demo-item-1a', product_id: 'demo-p-milk', quantity: 2, unit_price_at_order: 58, products: MILK },
      { id: 'demo-item-1b', product_id: 'demo-p-bread', quantity: 3, unit_price_at_order: 49.67, products: BREAD },
    ],
    users: { name: 'Aditi Rao', phone: '+91 98450 12345' },
    addresses: { line1: '4th Cross, Kaup', landmark: 'Near bus stand', recipient_name: 'Aditi Rao' },
  },
  {
    id: 'demo-order-2',
    order_number: 'FLK-1043',
    status: 'placed',
    item_total: 150,
    delivery_fee: 20,
    commission_amount: 15,
    total: 170,
    provider_payment_id: null,
    placed_at: hoursAgo(1.1),
    packed_at: null,
    picked_up_at: null,
    delivered_at: null,
    order_items: [{ id: 'demo-item-2a', product_id: 'demo-p-maggi', quantity: 5, unit_price_at_order: 30, products: MAGGI }],
    users: { name: 'Suresh Poojary', phone: '+91 99001 22334' },
    addresses: { line1: 'Temple Road, Kaup', landmark: null, recipient_name: 'Suresh Poojary' },
  },
  {
    id: 'demo-order-3',
    order_number: 'FLK-1044',
    status: 'packed',
    item_total: 720,
    delivery_fee: 20,
    commission_amount: 72,
    total: 740,
    provider_payment_id: 'demo_pay_3',
    placed_at: hoursAgo(2.4),
    packed_at: hoursAgo(1.9),
    picked_up_at: null,
    delivered_at: null,
    order_items: [
      { id: 'demo-item-3a', product_id: 'demo-p-atta', quantity: 1, unit_price_at_order: 285, products: ATTA },
      { id: 'demo-item-3b', product_id: 'demo-p-salt', quantity: 4, unit_price_at_order: 22, products: SALT },
      { id: 'demo-item-3c', product_id: 'demo-p-tea', quantity: 3, unit_price_at_order: 105.67, products: TEA },
    ],
    users: { name: 'Priya Kamath', phone: '+91 97410 88990' },
    addresses: { line1: 'Market Road, Kaup', landmark: 'Opp. petrol pump', recipient_name: 'Priya Kamath' },
  },
  {
    id: 'demo-order-4',
    order_number: 'FLK-1045',
    status: 'out_for_delivery',
    item_total: 116,
    delivery_fee: 20,
    commission_amount: 12,
    total: 136,
    provider_payment_id: 'demo_pay_4',
    placed_at: hoursAgo(3.5),
    packed_at: hoursAgo(3.1),
    picked_up_at: hoursAgo(1.4),
    delivered_at: null,
    order_items: [{ id: 'demo-item-4a', product_id: 'demo-p-milk', quantity: 2, unit_price_at_order: 58, products: MILK }],
    users: { name: 'Rahul Shetty', phone: '+91 90080 11223' },
    addresses: { line1: 'Beach Road, Kaup', landmark: null, recipient_name: 'Rahul Shetty' },
  },
  {
    id: 'demo-order-5',
    order_number: 'FLK-1046',
    status: 'delivered',
    item_total: 480,
    delivery_fee: 20,
    commission_amount: 48,
    total: 500,
    provider_payment_id: 'demo_pay_5',
    placed_at: daysAgo(1),
    packed_at: daysAgo(1),
    picked_up_at: daysAgo(1),
    delivered_at: daysAgo(1),
    order_items: [
      { id: 'demo-item-5a', product_id: 'demo-p-bread', quantity: 2, unit_price_at_order: 45, products: BREAD },
      { id: 'demo-item-5b', product_id: 'demo-p-tea', quantity: 1, unit_price_at_order: 130, products: TEA },
      { id: 'demo-item-5c', product_id: 'demo-p-maggi', quantity: 4, unit_price_at_order: 65, products: MAGGI },
    ],
    users: { name: 'Nisha Shenoy', phone: '+91 96110 44556' },
    addresses: { line1: 'School Road, Kaup', landmark: 'Near govt school', recipient_name: 'Nisha Shenoy' },
  },
  {
    id: 'demo-order-6',
    order_number: 'FLK-1047',
    status: 'delivered',
    item_total: 265,
    delivery_fee: 20,
    commission_amount: 27,
    total: 285,
    provider_payment_id: 'demo_pay_6',
    placed_at: daysAgo(2),
    packed_at: daysAgo(2),
    picked_up_at: daysAgo(2),
    delivered_at: daysAgo(2),
    order_items: [{ id: 'demo-item-6a', product_id: 'demo-p-salt', quantity: 12, unit_price_at_order: 22.08, products: SALT }],
    users: { name: 'Manoj Kumar', phone: '+91 95350 77889' },
    addresses: { line1: 'Harbour Road, Kaup', landmark: null, recipient_name: 'Manoj Kumar' },
  },
  {
    id: 'demo-order-7',
    order_number: 'FLK-1048',
    status: 'cancelled',
    item_total: 195,
    delivery_fee: 20,
    commission_amount: 0,
    total: 215,
    provider_payment_id: null,
    placed_at: daysAgo(1.4),
    packed_at: null,
    picked_up_at: null,
    delivered_at: null,
    order_items: [{ id: 'demo-item-7a', product_id: 'demo-p-atta', quantity: 1, unit_price_at_order: 195, products: ATTA }],
    users: { name: 'Divya Bhat', phone: '+91 94480 33221' },
    addresses: { line1: 'Church Street, Kaup', landmark: null, recipient_name: 'Divya Bhat' },
  },
];

// A month of delivered history so the sales charts and analytics have shape.
// Deterministic (no Math.random) so every render shows the same numbers.
const CUSTOMERS = ['Ramesh Shetty', 'Kavya Nayak', 'Pradeep Kini', 'Shwetha Rao', 'Anil Kotian', 'Meera Pai', 'Rahul Acharya', 'Nisha Salian'];
const CATALOGUE = [
  { product: MILK, id: 'demo-p-milk', price: 29 },
  { product: BREAD, id: 'demo-p-bread', price: 50 },
  { product: SALT, id: 'demo-p-salt', price: 28 },
  { product: MAGGI, id: 'demo-p-maggi', price: 30 },
  { product: TEA, id: 'demo-p-tea', price: 140 },
  { product: ATTA, id: 'demo-p-atta', price: 285 },
];

function historyOrder(n: number): PartnerOrder {
  const day = 1 + Math.floor(n / 2); // two orders a day, back 30 days
  const placed = daysAgo(day + ((n * 7) % 10) / 24);
  const lines = [CATALOGUE[n % 6], CATALOGUE[(n * 5 + 2) % 6]].filter((line, i, all) => all.indexOf(line) === i);
  const items = lines.map((line, i) => {
    const quantity = 1 + ((n + i * 3) % 4);
    return { id: `demo-hist-${n}-${i}`, product_id: line.id, quantity, unit_price_at_order: line.price, products: line.product };
  });
  const itemTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price_at_order, 0);
  const cancelled = n % 11 === 5;
  const customer = CUSTOMERS[n % CUSTOMERS.length];
  return {
    id: `demo-hist-${n}`,
    order_number: `FLK-${980 - n}`,
    status: cancelled ? 'cancelled' : 'delivered',
    item_total: itemTotal,
    delivery_fee: 20,
    commission_amount: Math.round(itemTotal * 0.1),
    total: itemTotal + 20,
    provider_payment_id: n % 3 === 0 ? null : `demo_pay_h${n}`,
    placed_at: placed,
    packed_at: cancelled ? null : placed,
    picked_up_at: cancelled ? null : placed,
    delivered_at: cancelled ? null : placed,
    order_items: items,
    users: { name: customer, phone: `+91 98${String(450000 + n * 137).padStart(6, '0')}${n % 10}0` },
    addresses: { line1: ['Market Road, Kaup', 'Beach Road, Kaup', 'Station Road, Kaup'][n % 3], landmark: null, recipient_name: customer },
  } as PartnerOrder;
}

export const DEMO_ORDERS: PartnerOrder[] = [...HAND_PICKED, ...Array.from({ length: 60 }, (_, n) => historyOrder(n))];

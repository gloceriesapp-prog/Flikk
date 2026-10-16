import { expect, it } from 'vitest';
import { mapApiOrder } from '../../../apps/partner/src/screens/orders/data';
import type { ApiOrder } from '../../../apps/partner/src/api/orders';
const order = {
 id: 'one', order_number: 'FLK-1', status: 'delivered', total: 29, item_total: 29,
 commission_amount: 1, payment_method: 'cod', provider_payment_id: null,
 placed_at: '2026-10-15T00:00:00Z', packed_at: null, delivered_at: null,
 users: null, addresses: null,
 order_items: [{ id: 'item', product_id: 'product', quantity: 2, unit_price_at_order: 14.5,
 product_name_at_order: 'Purchased milk', unit_at_order: '500 ml', product_image_at_order: 'https://images.gloceries.com/products/old.webp',
 products: { name: 'Renamed milk', unit: '1 L', image_url: 'https://images.gloceries.com/products/new.webp' } }],
} satisfies ApiOrder;
it('renders immutable purchased name, pack, image and line price', () => {
 expect(mapApiOrder(order, [order]).items[0]).toEqual({ name: 'Purchased milk', unit: '500 ml', quantity: 2, price: 29, imageUrl: 'https://images.gloceries.com/products/old.webp' });
});
it('renders order times in India even when the process timezone is UTC', () => {
 const original = process.env.TZ;
 try {
  process.env.TZ = 'UTC';
  expect(mapApiOrder(order, [order]).placedAtTime.replace(/\s+/g, ' ').toLowerCase()).toBe('05:30 am');
  const late = { ...order, placed_at: '2026-10-15T20:45:00Z' };
  expect(mapApiOrder(late, [late]).placedAtTime.replace(/\s+/g, ' ').toLowerCase()).toBe('02:15 am');
 } finally {
  if (original === undefined) delete process.env.TZ;
  else process.env.TZ = original;
 }
});
it('does not replace an intentionally absent purchased image with a newer catalogue image', () => {
 const noPhoto = { ...order, order_items: [{ ...order.order_items[0], product_image_at_order: null }] };
 expect(mapApiOrder(noPhoto, [noPhoto]).items[0].imageUrl).toBeNull();
});
it('retains the legacy fallback for historical rows without snapshots', () => {
 const legacy = { ...order, order_items: [{ ...order.order_items[0], product_name_at_order: null, product_image_at_order: null, unit_at_order: null }] };
 expect(mapApiOrder(legacy, [legacy]).items[0]).toMatchObject({ name: 'Renamed milk', unit: '1 L', imageUrl: 'https://images.gloceries.com/products/new.webp' });
});

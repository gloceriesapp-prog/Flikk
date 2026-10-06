import { describe, expect, it } from 'vitest';
import { mapApiProduct, type ApiProduct } from '../../../apps/customer/src/api/products';
import { productAvailability } from '../../../apps/customer/src/utils/productAvailability';
import { shopIsOpen } from '../../../apps/customer/src/utils/storeOpening';
import { storeIsOpen, type EligibilityStore } from '../lib/checkoutEligibility.js';
import { selectBalancedProducts } from '../../../apps/customer/src/screens/home/groceries/selectBalancedProducts';

const row: ApiProduct = {
  id: 'product', name: 'Puja incense', category: 'puja', local_name: null, description: null,
  price: 10, original_price: null, image_url: 'https://test.invalid/image.png', bg_color: null,
  is_veg: true, freshness_tag: null, product_variants: [], store_id: 'shop',
  is_in_stock: true, stock_tracking_enabled: true, stock_quantity: 5, approval_status: 'approved',
  stores: { name: 'Shop', is_active: false, open_time: null, close_time: null, fssai_number: null, address_line: null, city: null, photo_url: null },
};
describe('Visible catalogue versus orderability', () => {
  it('keeps closed-shop items and their prices while blocking Add', () => {
    expect(selectBalancedProducts([row], [/incense/])).toEqual([row]);
    const product = mapApiProduct(row);
    expect(product).toMatchObject({ id: row.id, price: 10, imageUrl: row.image_url });
    expect(productAvailability(product)).toEqual({ isAvailable: false, label: 'Shop closed' });
    expect(productAvailability(mapApiProduct({ ...row, stores: { ...row.stores!, is_active: true } }))).toEqual({ isAvailable: true, label: undefined });
  });
  it('keeps sold-out items visible and distinguishes stock from shop closure', () => {
    const soldOut = { ...row, is_in_stock: false, stock_quantity: 0 };
    expect(selectBalancedProducts([soldOut], [/incense/])).toHaveLength(1);
    expect(productAvailability(mapApiProduct(soldOut))).toEqual({ isAvailable: false, label: 'Out of stock' });
  });
  it('does not mislabel unconfirmed legacy stock as sold out or allow ordering', () => {
    const legacy = mapApiProduct({ ...row, stock_tracking_enabled: false, stock_quantity: 0,
      product_variants: [{ id: 'pack', unit_type: 'pc', quantity: 1, price: 10, original_price: null, is_default: true, stock_quantity: null }] });
    expect(legacy).toMatchObject({ isAvailable: false, unavailableReason: 'stock_unconfirmed' });
    expect(productAvailability(legacy)).toEqual({ isAvailable: false, label: 'Stock updating' });
    const confirmed = mapApiProduct({ ...row, stores: { ...row.stores!, is_active: true }, stock_quantity: 3,
      product_variants: [{ id: 'pack', unit_type: 'pc', quantity: 1, price: 10, original_price: null, is_default: true, stock_quantity: 3 }] });
    expect(productAvailability(confirmed)).toEqual({ isAvailable: true, label: undefined });
  });
  it('uses the same scheduled opening rules as backend checkout', () => {
    for (const [openTime, closeTime] of [[null, null], ['6:00 AM', '9:00 PM'], ['9:00 PM', '2:00 AM'], ['00:00', '00:00'], ['bad', '9:00 PM'], [null, '9:00 PM']]) {
      for (const isActive of [false, true]) {
        for (const hour of [0, 6, 15, 20]) {
          const date = new Date(`2026-10-05T${String(hour).padStart(2, '0')}:00:00Z`);
          const server = { is_active: isActive, open_time: openTime, close_time: closeTime } as EligibilityStore;
          expect(shopIsOpen({ isActive, openTime, closeTime }, date)).toBe(storeIsOpen(server, date));
        }
      }
    }
  });
});

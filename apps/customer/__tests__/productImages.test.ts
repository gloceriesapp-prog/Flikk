import { mapApiProduct, type ApiProduct } from '../src/api/products';

const row = (image_url: string | null, extra_image_urls?: string[] | null): ApiProduct => ({
  id: 'p1', name: 'Tomato', local_name: null, category: 'Vegetables', description: null, price: 40, original_price: null,
  image_url, extra_image_urls, bg_color: null, is_veg: true, freshness_tag: null, store_id: 's1', stores: null,
  product_variants: [{ id: 'v1', unit_type: 'kg', quantity: 1, price: 40, original_price: null, is_default: true }],
});

test('cover comes first, then the gallery, without repeats', () => {
  expect(mapApiProduct(row('a', ['b', 'a', 'c', 'b'])).imageUrls).toEqual(['a', 'b', 'c']);
});

test('one photo, no gallery, or no cover', () => {
  expect(mapApiProduct(row('a')).imageUrls).toEqual(['a']);
  expect(mapApiProduct(row('a', null)).imageUrls).toEqual(['a']);
  expect(mapApiProduct(row(null, ['b'])).imageUrls).toEqual([]);
});

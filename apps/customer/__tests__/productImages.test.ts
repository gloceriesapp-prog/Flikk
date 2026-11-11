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

test('flavours expose their own ordered galleries with backward-compatible covers', () => {
  const product = mapApiProduct({ ...row('generic', ['generic-extra']), product_options: [
    { id: 'mango', name: 'Mango', image_url: 'mango-cover', extra_image_urls: ['mango-back', 'mango-cover'], sort_order: 0, is_available: true },
    { id: 'rose', name: 'Rose', image_url: 'rose-cover', sort_order: 1, is_available: true },
  ] });
  expect(product.options?.[0]?.imageUrls).toEqual(['mango-cover', 'mango-back']);
  expect(product.options?.[1]?.imageUrls).toEqual(['rose-cover']);
  expect(product.imageUrls).toEqual(['generic', 'generic-extra']);
});

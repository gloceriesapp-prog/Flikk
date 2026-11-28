import { pickCardProducts, type CardPageInfo } from '../src/screens/home/today-grid/card-page/cardProducts';
import type { ApiProduct } from '../src/api/products';

const row = (id: string, patch: Partial<ApiProduct> = {}) => ({ id, name: id, category: 'Snacks', price: 50, original_price: null, sub_category_id: null, bulk_min_kg: null, ...patch }) as ApiProduct;
const rows = [
  row('chips'), row('soda', { category: 'Cold Drinks', original_price: 60 }), row('rice', { category: 'Rice', bulk_min_kg: 10 }),
  row('dal', { category: 'Dals', sub_category_id: 'sub-1' }),
];
const card = (target: CardPageInfo['target'], categories: string[] = []): CardPageInfo => ({ id: 'snack-time', title: 'X', bannerUrl: null, categories, target });
const ids = (list: ApiProduct[]) => list.map((r) => r.id);

it('card page fallback lists the products its target points at', () => {
  expect(ids(pickCardProducts(rows, card({ type: 'categories', categories: [] }, ['Snacks', 'Cold Drinks'])))).toEqual(['chips', 'soda']);
  expect(ids(pickCardProducts(rows, card({ type: 'categories', categories: ['Rice'] }, ['Snacks'])))).toEqual(['rice']);
  expect(ids(pickCardProducts(rows, card({ type: 'products', productIds: ['dal', 'chips'] })))).toEqual(['chips', 'dal']);
  expect(ids(pickCardProducts(rows, card({ type: 'subcategory', id: 'sub-1' })))).toEqual(['dal']);
  expect(ids(pickCardProducts(rows, card({ type: 'action', id: 'offers' })))).toEqual(['soda']);
  expect(ids(pickCardProducts(rows, card({ type: 'action', id: 'bulk' })))).toEqual(['rice']);
  expect(pickCardProducts(rows, card({ type: 'action', id: 'add-usuals' }))).toEqual([]); // personal: server only
});

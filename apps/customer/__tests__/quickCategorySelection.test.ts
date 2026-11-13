import { selectQuickCategoryTabs } from '../src/screens/home/quick-categories/selection';
import type { RemoteHomeTab } from '../src/screens/home/data/useHomeTabs';
const tab = (id: string, quickCategory?: RemoteHomeTab['quickCategory']): RemoteHomeTab => ({ id, name: id, tiles: [], banners: [], quickCategory });
const config = { visible: true, order: null, configured: false };

it('preserves legacy order/hidden names and does not modify the source tabs', () => {
  const tabs = [tab('Fresh'), tab('Bakery'), tab('Local')];
  expect(selectQuickCategoryTabs(tabs, new Set(['bakery'])).map(t => t.id)).toEqual(['Fresh', 'Local']);
  expect(tabs).toHaveLength(3);
});
it('explicit visibility overrides legacy hiding without affecting other tabs', () => {
  const tabs = [tab('Bakery', config), tab('Fresh', { ...config, visible: false })];
  expect(selectQuickCategoryTabs(tabs, new Set(['bakery'])).map(t => t.id)).toEqual(['Bakery']);
  expect(tabs).toHaveLength(2);
});
it('sorts shortcuts independently, with stable ties and order zero', () => {
  const tabs = [tab('A', { ...config, order: 5 }), tab('B', { ...config, order: 0 }), tab('C', { ...config, order: 5 })];
  expect(selectQuickCategoryTabs(tabs, new Set()).map(t => t.id)).toEqual(['B', 'A', 'C']);
});
it('hides a broken target and preserves valid direct and custom collection targets', () => {
  const tabs = [tab('Broken', { ...config, configured: true }), tab('Custom'), tab('Fruit', { ...config, configured: true, link: { type: 'category', id: 'fruit', categoryId: 'fruit' } })];
  expect(selectQuickCategoryTabs(tabs, new Set()).map(t => t.id)).toEqual(['Custom', 'Fruit']);
});

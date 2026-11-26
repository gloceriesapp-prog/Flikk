import { fireEvent, render } from '@testing-library/react-native';
import { DEFAULT_CONTENT } from '../src/screens/home/content/contracts';
import { FreshProduceTabs } from '../src/screens/home/fresh/components/FreshProduceTabs';
import { partitionFreshSections } from '../src/screens/home/fresh/freshProduceSections';
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));

it('has three full-width choices with accessible selection', async () => {
  const onChange = jest.fn();
  const view = await render(<FreshProduceTabs value="everyday" onChange={onChange} />);
  expect(view.getAllByRole('tab')).toHaveLength(3);
  expect(view.getByText('Vegetables')).toBeTruthy();
  expect(view.getByText('Fruits')).toBeTruthy();
  expect(view.getByText('Village Fresh')).toBeTruthy();
  expect(view.queryByText('From nearby shops')).toBeNull();
  expect(view.queryByText('Choose your vegetables')).toBeNull();
  expect(view.getByRole('tab', { name: 'Vegetables', selected: true })).toBeTruthy();
  await fireEvent.press(view.getByRole('tab', { name: 'Fruits' }));
  expect(onChange).toHaveBeenCalledWith('fruits');
  await fireEvent.press(view.getByRole('tab', { name: 'Village Fresh' }));
  expect(onChange).toHaveBeenCalledWith('village');
  await view.rerender(<FreshProduceTabs value="village" onChange={onChange} />);
  expect(view.getByRole('tab', { name: 'Village Fresh', selected: true })).toBeTruthy();
});
it('keeps Everyday Fresh above the selector and separates fruit and village content', () => {
  const parts = partitionFreshSections(DEFAULT_CONTENT.fresh.sections);
  expect(parts.intro.at(-1)?.id).toBe('everyday-fresh');
  expect(parts.everyday.some(section => section.id === 'everyday-vegetables')).toBe(true);
  expect(parts.everyday.some(section => section.id === 'home-grown-nearby')).toBe(false);
  expect(parts.fruits.map(section => section.id)).toEqual(['fruit-favourites']);
  expect(parts.everyday.some(section => section.id === 'fruit-favourites')).toBe(false);
  expect(parts.village.map(section => section.id)).toEqual(['home-grown-nearby']);
  expect(parts.footer.every(section => section.kind === 'footer')).toBe(true);
});
it('respects Admin visibility and keeps reordered village content out of the shared intro', () => {
  const sections = structuredClone(DEFAULT_CONTENT.fresh.sections);
  const village = sections.find(section => section.id === 'home-grown-nearby')!;
  const reordered = [village, ...sections.filter(section => section !== village)];
  expect(partitionFreshSections(reordered).intro.some(section => section.id === village.id)).toBe(false);
  expect(partitionFreshSections(reordered).village).toEqual([village]);
  village.enabled = false;
  expect(partitionFreshSections(reordered).village).toEqual([]);
});

it('uses explicit placements for new, renamed and reordered sections', () => {
  const sections = structuredClone(DEFAULT_CONTENT.fresh.sections);
  const shelf = { ...sections[0], id: 'village-vegetables', title: 'Local harvest', freshPlacement: 'village' as const };
  const shared = { ...sections[0], id: 'shared-picks', freshPlacement: 'both' as const };
  const mango = { ...sections[0], id: 'mango-season', freshPlacement: 'fruits' as const };
  const parts = partitionFreshSections([shelf, shared, mango, ...sections]);
  expect(parts.fruits.map(s => s.id)).toEqual(['shared-picks', 'mango-season', 'fruit-favourites']);
  expect(parts.everyday.some(s => s.id === mango.id)).toBe(false);
  expect(parts.village.map(s => s.id)).toEqual(['village-vegetables', 'shared-picks', 'home-grown-nearby']);
  expect(parts.everyday.some(s => s.id === shelf.id)).toBe(false);
  expect(parts.everyday.some(s => s.id === shared.id)).toBe(true);
  expect(parts.intro.some(s => s.id === shelf.id || s.id === shared.id)).toBe(false);
});
it('renders published titles, using the default for a choice saved before it existed', async () => {
  const view = await render(<FreshProduceTabs value="village" onChange={jest.fn()} titles={{ everyday: 'Daily Veg', village: 'Local Harvest' }} />);
  expect(view.getAllByRole('tab')).toHaveLength(3);
  expect(view.getByRole('tab', { name: 'Fruits' })).toBeTruthy();
  expect(view.getByRole('tab', { name: 'Local Harvest', selected: true })).toBeTruthy();
  expect(view.getByText('Daily Veg')).toBeTruthy();
});

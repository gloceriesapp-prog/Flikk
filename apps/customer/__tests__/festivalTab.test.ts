import { DISABLED_FESTIVAL_TAB, FESTIVAL_TAB_ID, mapFestivalTabConfig, withFestivalHomeTab } from '../src/screens/home/festival/data';

const tab = (id: string, name: string) => ({ id, name, tiles: [], banners: [] });
const tabs = [tab('g', 'Groceries'), tab('n', 'Navratri'), tab('b', 'Bakery')];

test('no festival tab unless the admin enables it', () => {
  expect(withFestivalHomeTab([tab('g', 'Groceries')], DISABLED_FESTIVAL_TAB).map((t) => t.id)).toEqual(['g']);
  // A legacy Navratri admin tab is hidden too while the festival is off.
  expect(withFestivalHomeTab(tabs, DISABLED_FESTIVAL_TAB).map((t) => t.id)).toEqual(['g', 'b']);
  expect(mapFestivalTabConfig(undefined).enabled).toBe(false);
  expect(mapFestivalTabConfig({ title: 'Diwali' }).enabled).toBe(false);
});

test('an enabled festival tab goes first with the admin title and colours', () => {
  const config = mapFestivalTabConfig({ enabled: true, title: 'Diwali', backgroundColor: '#FFEEDD', headerColor: 'nope',
    headerImageUrl: 'Images/diwali.png', bannerImageUrl: 'javascript:alert(1)' });
  expect(config.headerColor).toBe(DISABLED_FESTIVAL_TAB.headerColor);
  expect(config.headerImageUri).toMatch(/\/storage\/v1\/object\/public\/Images\/diwali\.png$/);
  expect(config.bannerImageUri).toBeNull();
  const synthesized = withFestivalHomeTab([tab('g', 'Groceries')], config);
  expect(synthesized[0]).toMatchObject({ id: FESTIVAL_TAB_ID, label: 'Diwali', festival: config });
  // A matching admin tab keeps its id, tiles and banners; no duplicate.
  const matched = withFestivalHomeTab([tab('g', 'Groceries'), tab('d', 'diwali')], config);
  expect(matched.map((t) => t.id)).toEqual(['d', 'g']);
  expect(matched[0]!.festival).toBe(config);
});

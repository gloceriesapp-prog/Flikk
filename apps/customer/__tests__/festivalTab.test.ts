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


test('seasonal artwork reuses the managed Festivals tab instead of duplicating it', () => {
  const managed = { ...tab('published-festivals', 'Festivals'), contentKey: 'festivals' as const };
  const config = mapFestivalTabConfig({ enabled: true, title: 'Diwali' });
  const result = withFestivalHomeTab([tab('g', 'Groceries'), managed, tab('n', 'Navratri')], config);
  expect(result.map(item => item.id)).toEqual(['published-festivals', 'g']);
  expect(result[0]).toMatchObject({ contentKey: 'festivals', label: 'Diwali', festival: config });
});

test('an admin-disabled managed Festival tab cannot be resurrected by seasonal artwork', () => {
  const config = mapFestivalTabConfig({ enabled: true, title: 'Diwali' });
  const result = withFestivalHomeTab([tab('g', 'Groceries'), tab('n', 'Navratri')], config, false);
  expect(result.map(item => item.id)).toEqual(['g']);
});


test('unifying festival tabs preserves existing seasonal tiles and banners', () => {
  const managed = { ...tab('managed', 'Festivals'), contentKey: 'festivals' as const,
    tiles: [{ id: 'managed-tile', name: 'Shop festival products' }] };
  const legacy = { ...tab('legacy', 'Navratri'), tiles: [{ id: 'legacy-tile', name: 'Puja picks' }],
    banners: [{ id: 'poster', imageUrl: 'https://example.com/festival.png' }] };
  const result = withFestivalHomeTab([managed, legacy], mapFestivalTabConfig({ enabled: true, title: 'Navratri' }));
  expect(result).toHaveLength(1);
  expect(result[0]!.tiles.map(tile => tile.id)).toEqual(['managed-tile', 'legacy-tile']);
  expect(result[0]!.banners).toEqual(legacy.banners);
});

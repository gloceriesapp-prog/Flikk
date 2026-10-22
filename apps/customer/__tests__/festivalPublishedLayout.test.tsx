import { render } from '@testing-library/react-native';
import { DEFAULT_CONTENT, type HomeContentDocument } from '../src/screens/home/content/contracts';
import { FestivalTab } from '../src/screens/home/festival/FestivalTab';

let mockContent: HomeContentDocument;
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../src/screens/home/content/useHomeContent', () => ({ useHomeContent: () => ({
  data: [{ tabKey: 'festivals', content: mockContent }], isPending: false, isError: false,
}) }));
jest.mock('../src/screens/home/groceries/useNearbyGroceryInventory', () => ({ useNearbyGroceryInventory: () => ({
  visibleProducts: [{ id: 'wick', name: 'Cotton wick', category: 'Puja', store_id: 'store', price: 20, original_price: 25 }],
  inventory: [], hasLocation: true, isLoading: false, isError: false, retry: jest.fn(),
}) }));
jest.mock('../src/screens/home/content/productMapping', () => ({ mapContentProduct: (row: unknown) => row }));
jest.mock('../src/screens/home/components/SectionTitle', () => ({ SectionTitle: 'Text' }));
jest.mock('../src/screens/home/groceries/components/GroceryProductTile', () => ({ GroceryProductTile: 'Text' }));
jest.mock('../src/screens/home/groceries/components/SeeAllProductsButton', () => ({ SeeAllProductsButton: () => null }));
jest.mock('../src/screens/home/groceries/shops-you-know/GroceryStorePreviewCard', () => ({ GroceryStorePreviewCard: () => null }));
jest.mock('../src/screens/home/regional/nearby-shops/RegionalShopCard', () => ({ RegionalShopCard: () => null }));
jest.mock('../src/screens/home/content/ContentImage', () => ({ ContentImage: () => null }));
jest.mock('../src/screens/home/content/ContentTiles', () => ({ ContentTiles: () => null }));
jest.mock('../src/screens/home/fresh/home-grown-nearby/HomeGrownBackground', () => ({ HomeGrownBackground: () => null }));
jest.mock('../src/screens/home/festival/picks/FestivalPicksSection', () => ({ FestivalPicksSection: 'Text' }));
jest.mock('../src/screens/home/festival/greeting/FestivalGreetingPanel', () => ({ FestivalGreetingPanel: () => null }));
jest.mock('../src/screens/home/hometab/HomeTabTileGrid', () => ({ HomeTabTileGrid: () => null }));
const tab = { id: 'festivals', name: 'Festivals', tiles: [], banners: [], contentKey: 'festivals' as const };

beforeEach(() => { mockContent = JSON.parse(JSON.stringify(DEFAULT_CONTENT.festivals)); });

it('renders published festival shelves with real stock and hides empty shelves', async () => {
  const view = await render(<FestivalTab tab={tab} />);
  expect(view.getByText('Puja essentials')).toBeTruthy();
  expect(view.queryByText('Flowers & garlands')).toBeNull();
  expect(view.queryByText('Sweets to share')).toBeNull();
});

it('applies published titles, manual selections, ordering and visibility to the actual festival renderer', async () => {
  const puja = mockContent.sections.find(section => section.id === 'festival-puja')!;
  puja.title = 'Store puja favourites';
  const flowers = mockContent.sections.find(section => section.id === 'festival-flowers')!;
  flowers.selection.mode = 'manual';
  flowers.selection.includeTerms = [];
  flowers.selection.productIds = ['wick'];
  mockContent.sections = [flowers, puja];
  const view = await render(<FestivalTab tab={tab} />);
  expect(view.getByText('Flowers & garlands')).toBeTruthy();
  expect(view.getByText('Store puja favourites')).toBeTruthy();
  const rendered = JSON.stringify(view.toJSON());
  expect(rendered.indexOf('Flowers & garlands')).toBeLessThan(rendered.indexOf('Store puja favourites'));
  mockContent = { ...mockContent, sections: mockContent.sections.map(section => ({ ...section, enabled: false })) };
  await view.rerender(<FestivalTab tab={tab} />);
  expect(view.queryByText('Store puja favourites')).toBeNull();
  expect(view.queryByText('Flowers & garlands')).toBeNull();
});

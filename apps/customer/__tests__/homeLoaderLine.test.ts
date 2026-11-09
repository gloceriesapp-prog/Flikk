import { HOME_LOADER_LINES, pickLoaderLine } from '../src/screens/home/loading/HomeLoader';

jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));

test('picks one of the three loader lines, covering each', () => {
  expect(pickLoaderLine(() => 0)).toBe('Something Wonderful Awaits, Tulunadu...');
  expect(pickLoaderLine(() => 0.5)).toBe('Everything You Love, Just a Tap Away...');
  expect(pickLoaderLine(() => 0.9999)).toBe('Bringing Local Treasures Closer to Home...');
  for (let i = 0; i < 50; i++) expect(HOME_LOADER_LINES).toContain(pickLoaderLine());
});

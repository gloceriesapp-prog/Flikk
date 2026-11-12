import { fireEvent, render, screen } from '@testing-library/react-native';
import { PopularBrands } from '../src/screens/categories/components/PopularBrands';

let mockCount = 10;
const mockBrands = Array.from({ length: 11 }, (_, i) => ({ id: String(i), name: `Brand ${i}`, imageUrl: `https://example.com/${i}.png` }));
jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: mockBrands.slice(0, mockCount) }) }));
jest.mock('../src/components/AppImage', () => ({ AppImage: require('react-native').Image }));
jest.mock('../src/api/brands', () => ({ fetchPopularBrands: jest.fn() }));

it('shows ten brand icons and See all only for an overflow, preserving brand selection', async () => {
  const select = jest.fn(); const seeAll = jest.fn();
  const { rerender } = await render(<PopularBrands onSelect={select} onSeeAll={seeAll} />);
  expect(screen.getAllByRole('button')).toHaveLength(10);
  expect(screen.queryByLabelText('See all brands')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Brand 3'));
  expect(select).toHaveBeenCalledWith(mockBrands[3]);
  mockCount = 11;
  await rerender(<PopularBrands onSelect={select} onSeeAll={seeAll} />);
  expect(screen.queryByLabelText('Brand 10')).toBeNull();
  await fireEvent.press(screen.getByLabelText('See all brands'));
  expect(seeAll).toHaveBeenCalledTimes(1);
  mockCount = 0;
  await rerender(<PopularBrands onSelect={select} onSeeAll={seeAll} />);
  expect(screen.queryByText('Popular brands')).toBeNull();
});

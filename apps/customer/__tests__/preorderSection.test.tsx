/* eslint-disable @typescript-eslint/no-require-imports -- Hoisted Jest mocks resolve React and native components at runtime. */
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PreorderSection } from '../src/screens/home/preorders/PreorderSection';

const mockNavigate = jest.fn();
const mockProducts = Array.from({ length: 5 }, (_, index) => ({
  id: String(index), name: `Dish ${index}`, preorder: { leadDays: 1 },
}));
let mockCount = 4;

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: mockNavigate }) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: require('react-native').View }));
jest.mock('../src/components/AppImage', () => ({ AppImage: require('react-native').Image }));
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/screens/home/products/ProductCard', () => ({
  ProductCard: ({ product }: { product: { name: string } }) => {
    const { Text } = require('react-native');
    return <Text>{product.name}</Text>;
  },
}));
jest.mock('../src/screens/home/preorders/usePreorders', () => ({
  usePreorders: () => ({
    data: {
      products: mockProducts.slice(0, mockCount),
      slots: [{ id: 'morning', label: 'Morning', startsMinute: 480, endsMinute: 600 }],
    },
  }),
}));

it('previews four bookable products and only offers the full collection when there are more', async () => {
  const { rerender } = await render(<PreorderSection title="Pre-order now" />);
  expect(screen.getAllByText(/^Dish /)).toHaveLength(4);
  expect(screen.queryByRole('button', { name: 'See all' })).toBeNull();
  expect(screen.queryByRole('radio')).toBeNull();

  mockCount = 5;
  await rerender(<PreorderSection title="Pre-order now" bannerImageUrl="https://example.com/preorders.png" />);
  expect(screen.getByLabelText('Pre-order now').props.source).toEqual({ uri: 'https://example.com/preorders.png' });
  expect(screen.getAllByText(/^Dish /)).toHaveLength(4);
  await fireEvent.press(screen.getByRole('button', { name: 'See all' }));
  expect(mockNavigate).toHaveBeenCalledWith('HomeSectionCollection', expect.objectContaining({ products: mockProducts }));
});

import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ProductDetailInfo } from '../src/components/ProductDetailSheet/ProductDetailInfo';
import type { Product } from '../src/screens/home/products/types';
jest.mock('../src/api/deliverySettings', () => ({ useDeliveryEstimateMinutes: () => 12, useDeliveryWindow: () => ({ min: 12, max: 12, note: null, category: null }) }));
jest.mock('../src/components/ProductDetailSheet/SimilarProductsRow', () => ({ SimilarProductsRow: () => null }));
jest.mock('../src/components/ProductDetailSheet/ProductServiceHighlights', () => ({ ProductServiceHighlights: () => null }));
jest.mock('../src/components/AppImage', () => ({ AppImage: () => null }));
jest.mock('../src/components/ProductPriceRow', () => ({ ProductPriceRow: ({ price, originalPrice }: { price: number; originalPrice?: number }) => {
  const { Text } = jest.requireActual('react-native');
  return <Text testID="selected-product-price">{`${price}|${originalPrice ?? ''}`}</Text>;
} }));
const product = { id: 'rice', name: 'Rice', localName: '', weight: '500 g', price: 40, originalPrice: 50,
  variants: [{ id: 'small', label: '500 g', price: 40, originalPrice: 50 }, { id: 'large', label: '1 kg', price: 79, originalPrice: 80 }] } as Product;
function Selection() {
  const [selected, setSelected] = useState('small');
  return <ProductDetailInfo product={product} selectedVariantId={selected} onSelectVariant={setSelected} />;
}
it('updates the price below the product title when a different pack is selected', async () => {
  const view = await render(<Selection />);
  expect(view.getByTestId('selected-product-price').props.children).toBe('40|50');
  await fireEvent.press(view.getByRole('radio', { name: '1 kg, ₹79' }));
  expect(view.getByTestId('selected-product-price').props.children).toBe('79|80');
  await fireEvent.press(view.getByRole('radio', { name: '500 g, ₹40' }));
  expect(view.getByTestId('selected-product-price').props.children).toBe('40|50');
});

import { fireEvent, render } from '@testing-library/react-native';
import { ProductServiceHighlights } from '../src/components/ProductDetailSheet/ProductServiceHighlights';
jest.mock('../src/api/deliverySettings', () => ({ useDeliveryEstimateMinutes: () => 12 }));
jest.mock('../src/api/appConfig', () => ({ useCopy: () => '9 AM–8 PM' }));

it('replaces the old replacement panel with three aligned service actions', async () => {
  const view = await render(<ProductServiceHighlights />);
  expect(view.getByText('6 Hours')).toBeTruthy();
  expect(view.getByText('Refund*')).toBeTruthy();
  expect(view.getByText('Fast')).toBeTruthy();
  expect(view.getByText('Delivery')).toBeTruthy();
  expect(view.getByText('24/7')).toBeTruthy();
  expect(view.getByText('Support')).toBeTruthy();
  expect(view.queryByText(/12 hours/i)).toBeNull();
});
it('explains the six-hour reporting window without promising a bank settlement time', async () => {
  const view = await render(<ProductServiceHighlights />);
  await fireEvent.press(view.getByRole('button', { name: '6 Hours Refund, read details' }));
  expect(view.getByText(/within 6 hours of delivery/)).toBeTruthy();
  expect(view.getByText(/payment provider’s processing time/)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Close' }));
  expect(view.queryByRole('header')).toBeNull();
});
it('uses the configured delivery estimate and support response hours', async () => {
  const view = await render(<ProductServiceHighlights />);
  await fireEvent.press(view.getByRole('button', { name: 'Fast Delivery, read details' }));
  expect(view.getByText(/current delivery estimate is 12 minutes/)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Close' }));
  await fireEvent.press(view.getByRole('button', { name: '24\/7 Support, read details' }));
  expect(view.getByText(/9 AM–8 PM/)).toBeTruthy();
});

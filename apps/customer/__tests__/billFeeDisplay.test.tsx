import { render } from '@testing-library/react-native';
import { BillDetailsCard } from '../src/screens/cart/components/BillDetailsCard';
import type { CheckoutQuote } from '../src/api/checkout';

jest.mock('../src/components/RupeePrice', () => {
  const { Text } = jest.requireActual('react-native');
  return { RupeePrice: ({ amount, strike }: { amount: string; strike?: boolean }) => <Text>{`${strike ? 'original ' : ''}₹${amount}`}</Text> };
});
jest.mock('../src/components/icons/IconlyClose', () => ({ IconlyClose: () => null }));
jest.mock('../src/components/icons/IconlyReceipt', () => ({ IconlyReceipt: () => null }));

const bill: CheckoutQuote['bill'] = { storeCount: 1, itemTotal: 40, originalItemTotal: 40, baseDeliveryFee: 20, additionalShopFee: 0, deliveryFee: 20, handlingFee: 10.01, originalBaseDeliveryFee: 30, originalHandlingFee: 12.55, discountAmount: 0, total: 70.01 };
const quote = (overrides: Partial<typeof bill> = {}) => ({ bill: { ...bill, ...overrides } }) as CheckoutQuote;

it('shows one original fee and one charged fee on each fee row', async () => {
  const view = await render(<BillDetailsCard quote={quote()} itemCount={1} />);
  expect(view.getByText('original ₹30.00')).toBeTruthy();
  expect(view.getByText('₹20.00')).toBeTruthy();
  expect(view.getByText('original ₹12.55')).toBeTruthy();
  expect(view.getByText('₹10.01')).toBeTruthy();
  expect(view.queryByText('FREE')).toBeNull();
});
it('replaces the zero amount with FREE rather than showing a third value', async () => {
  const view = await render(<BillDetailsCard quote={quote({ baseDeliveryFee: 0, handlingFee: 0 })} itemCount={1} />);
  expect(view.getAllByText('FREE')).toHaveLength(2);
  expect(view.queryByText('₹0.00')).toBeNull();
  expect(view.getByText('original ₹12.55')).toBeTruthy();
});
it('honours Admin zero-price label preferences without hiding nonzero charges', async () => {
  const view = await render(<BillDetailsCard quote={quote({ baseDeliveryFee: 0, deliveryFeeShowFree: false, handlingFeeShowFree: true })} itemCount={1} />);
  expect(view.getByText('₹0.00')).toBeTruthy();
  expect(view.getByText('₹10.01')).toBeTruthy();
  expect(view.queryByText('FREE')).toBeNull();
});
it('hides equal or smaller original fees', async () => {
  const view = await render(<BillDetailsCard quote={quote({ originalBaseDeliveryFee: 10, originalHandlingFee: 10.01 })} itemCount={1} />);
  expect(view.queryByText(/^original /)).toBeNull();
});

it('shows the original combined bill beside To Pay without duplicating delivery or tip', async () => {
  const view = await render(<BillDetailsCard quote={quote({ storeCount: 2, originalItemTotal: 100, additionalShopFee: 15, deliveryFee: 35, discountAmount: 5, tipAmount: 10, total: 90.01 })} itemCount={1} />);
  expect(view.getByText('To Pay')).toBeTruthy();
  expect(view.getByText('original ₹167.55')).toBeTruthy();
  expect(view.getByText('₹90.01')).toBeTruthy();
});
it('shows a single payable amount when there is no saving', async () => {
  const view = await render(<BillDetailsCard quote={quote({ originalBaseDeliveryFee: undefined, originalHandlingFee: undefined })} itemCount={1} />);
  expect(view.queryByText(/^original /)).toBeNull();
  expect(view.getByText('₹70.01')).toBeTruthy();
});

import { render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { ReceiptScreen } from '../src/screens/receipt/ReceiptScreen';

jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));
jest.mock('../src/components/SuccessSeal', () => ({ SuccessSeal: () => null }));
jest.mock('../src/components/BarcodeSvg', () => ({ BarcodeSvg: () => null }));

type Props = ComponentProps<typeof ReceiptScreen>;

function receipt(paymentMethodLabel: string) {
  return render(<ReceiptScreen
    navigation={{ navigate: jest.fn(), reset: jest.fn() } as unknown as Props['navigation']}
    route={{
      key: 'test-receipt', name: 'Receipt', params: {
        orderId: 'local-order', orderNumber: 'QA-1', amount: 63, items: [],
        paymentMethodLabel, placedAt: '2026-10-22T12:00:00Z',
        deliveryAddress: 'QA test address', estimatedDeliveryMinutes: 35, avgPrepMinutes: null,
      },
    }}
  />);
}

describe('receipt payment claims', () => {
  it('confirms a COD order without claiming that payment was collected', async () => {
    await receipt('Cash on Delivery');
    expect(screen.getByText('Order confirmed')).toBeTruthy();
    expect(screen.getByText('Order total')).toBeTruthy();
    expect(screen.getByText('Cash on Delivery')).toBeTruthy();
    expect(screen.queryByText('Payment Successful')).toBeNull();
    expect(screen.queryByText(/Paid via/)).toBeNull();
  });

  it('retains the paid-method detail for a verified online payment', async () => {
    await receipt('Online payment');
    expect(screen.getByText('Order confirmed')).toBeTruthy();
    expect(screen.getByText('Paid via Online payment')).toBeTruthy();
  });
});

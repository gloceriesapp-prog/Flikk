import { arrivalLine, headline, paymentLine } from '../src/screens/order-placed/orderPlacedText';

describe('order placed copy', () => {
  it('says how the order was paid', () => {
    expect(paymentLine(245, true, 'UPI')).toBe('₹245 paid via UPI');
    expect(paymentLine(245.5, true, 'Online payment')).toBe('₹245.50 paid');
    expect(paymentLine(245, false, 'Cash on delivery')).toBe('Pay ₹245 on delivery');
  });
  it('shows the pre-order slot, else the arrival estimate', () => {
    const now = Date.parse('2026-11-08T06:00:00Z');
    expect(arrivalLine({ preorderLabel: 'Tomorrow · 7 – 9 AM', estimatedDeliveryMinutes: 29 }, now)).toBe('Delivers Tomorrow · 7 – 9 AM');
    expect(arrivalLine({ estimatedDeliveryAt: '2026-11-08T06:29:00Z', estimatedDeliveryMinutes: 10 }, now)).toBe('Arriving in 29 mins');
    expect(arrivalLine({ estimatedDeliveryMinutes: 1 }, now)).toBe('Arriving in 1 min');
    expect(arrivalLine({}, now)).toBe('Arriving soon');
  });
});

test('headline: paid online, cash on delivery, pre-order', () => {
  expect(headline(true, false)).toBe('Order placed successfully!');
  expect(headline(false, false)).toBe('Order placed!');
  expect(headline(true, true)).toBe('Pre-order placed!');
});

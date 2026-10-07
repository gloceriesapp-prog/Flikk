import { buildReceiptText } from '../src/screens/receipt/receiptText';

it('builds a shareable receipt whose fee line is derived from the charged total', () => {
  const text = buildReceiptText({
    orderNumber: 'FLK-100042',
    placedAt: '2026-10-06T10:00:00Z',
    paymentMethodLabel: 'UPI',
    deliveryAddress: '12 Main Rd, Kaup',
    items: [{ name: 'Milk', quantity: 2, price: 30.5 }, { name: 'Bread', quantity: 1, price: 45 }],
    total: 141,
  });
  expect(text).toContain('Order: FLK-100042');
  expect(text).toContain('Milk × 2 — ₹61.00');
  expect(text).toContain('Item total: ₹106.00');
  expect(text).toContain('Delivery & handling: ₹35.00');
  expect(text).toContain('Total: ₹141.00');
});

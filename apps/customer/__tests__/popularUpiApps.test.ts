import { popularUpiApps } from '../src/payments/popularUpiApps';
import { UPI_APPS } from '../src/payments/upiApps';
test('shows only configured popular apps that discovery actually returned', () => {
  expect(popularUpiApps(UPI_APPS).map(app => app.id)).toEqual(['gpay', 'phonepe', 'paytm']);
  expect(popularUpiApps(UPI_APPS.filter(app => app.id === 'phonepe')).map(app => app.id)).toEqual(['phonepe']);
  expect(popularUpiApps([])).toEqual([]);
});

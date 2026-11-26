import { deliveredInMinutes } from '../src/screens/track-order/components/DeliveredCard';

it('rounds placed-to-delivered time to whole minutes, at least 1', () => {
  expect(deliveredInMinutes({ placed_at: '2026-11-26T10:00:00Z', delivered_at: '2026-11-26T10:16:20Z' })).toBe(16);
  expect(deliveredInMinutes({ placed_at: '2026-11-26T10:00:00Z', delivered_at: '2026-11-26T10:00:10Z' })).toBe(1);
});

it('returns null for missing or out-of-order times', () => {
  expect(deliveredInMinutes({ placed_at: '2026-11-26T10:00:00Z', delivered_at: null })).toBeNull();
  expect(deliveredInMinutes({ placed_at: '2026-11-26T10:20:00Z', delivered_at: '2026-11-26T10:00:00Z' })).toBeNull();
});

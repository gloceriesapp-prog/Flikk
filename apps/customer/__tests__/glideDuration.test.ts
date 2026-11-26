import { glideDuration } from '../src/screens/track-order/components/GlidingRider';

it('glides for the real time between the rider’s two GPS fixes', () => {
  expect(glideDuration(10_000, 5_000)).toBe(5_000);   // 5 s delivery pings
  expect(glideDuration(60_000, 15_000)).toBe(45_000); // 45 s background pings
  expect(glideDuration(5_500, 5_000)).toBe(1_000);    // never faster than 1 s
  expect(glideDuration(200_000, 0)).toBe(45_000);     // never slower than 45 s
});

it('falls back to one polling interval when the gap is unknown or backwards', () => {
  expect(glideDuration(10_000, null)).toBe(5_000);
  expect(glideDuration(10_000, 10_000)).toBe(5_000);
  expect(glideDuration(10_000, 12_000)).toBe(5_000);
});

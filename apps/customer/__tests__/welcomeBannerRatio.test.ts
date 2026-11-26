import { welcomeBannerRatio } from '../src/screens/home/welcome-banner/HomeWelcomeBanner';

it('takes the banner height from the artwork shape, within sane bounds', () => {
  expect(welcomeBannerRatio(546, 180)).toBeCloseTo(3.033, 3);
  expect(welcomeBannerRatio(1920, 1080)).toBeCloseTo(16 / 9);
  expect(welcomeBannerRatio(500, 1000)).toBe(1);
  expect(welcomeBannerRatio(3000, 100)).toBe(5);
  expect(welcomeBannerRatio(0, 180)).toBeNull();
  expect(welcomeBannerRatio(546, undefined)).toBeNull();
});

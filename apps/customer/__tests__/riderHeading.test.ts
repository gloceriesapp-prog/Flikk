import { riderHeading } from '../src/screens/track-order/state/routeProgress';

const at = (latitude: number, longitude: number) => ({ latitude, longitude });

it('faces the road ahead as a compass heading, clockwise from north', () => {
  expect(riderHeading([at(13.34, 74.74), at(13.35, 74.74)])).toBeCloseTo(0);
  expect(riderHeading([at(13.34, 74.74), at(13.34, 74.75)])).toBeCloseTo(90);
  expect(riderHeading([at(13.35, 74.74), at(13.34, 74.74)])).toBeCloseTo(180);
  expect(riderHeading([at(13.34, 74.75), at(13.34, 74.74)])).toBeCloseTo(270);
  const northEast = riderHeading([at(13.34, 74.74), at(13.35, 74.75)])!;
  expect(northEast).toBeGreaterThan(40);
  expect(northEast).toBeLessThan(50);
});

it('has no heading without a road or when already at the last point', () => {
  expect(riderHeading(null)).toBeNull();
  expect(riderHeading([at(13.34, 74.74)])).toBeNull();
  expect(riderHeading([at(13.34, 74.74), at(13.34, 74.74)])).toBeNull();
});

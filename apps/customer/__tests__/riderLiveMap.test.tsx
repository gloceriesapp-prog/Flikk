/* eslint-disable @typescript-eslint/no-require-imports -- Hoisted Jest mocks resolve React and native components at runtime. */
import { act, render } from '@testing-library/react-native';
import { RiderLiveMap } from '../src/screens/track-order/components/RiderLiveMap';
import type { RiderLocationResponse } from '../src/api/tracking';

jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));
jest.mock('../src/location/mapProvider', () => ({ usesGoogleMaps: () => true }));
jest.mock('react-native-maps', () => {
  const element = require('react').createElement;
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: object) => element(View, props),
    Marker: ({ title, ...props }: { title: string }) => element(View, { ...props, accessibilityLabel: title }),
    Polyline: (props: object) => element(View, { ...props, testID: 'tracking-polyline' }),
    PROVIDER_GOOGLE: 'google',
  };
});

const base: RiderLocationResponse = {
  active: true,
  destination: { lat: 12.97, lng: 77.59 },
  stale_after_seconds: 180,
  rider_location: { lat: 12.98, lng: 77.6, updated_at: '2026-10-15T10:00:00Z', age_seconds: 25, stale: false },
};

it('renders the rider and delivery pins without a caption row while fresh', async () => {
  const view = await render(<RiderLiveMap outForDelivery response={base} fetchedAt={Date.now()} />);
  // A fresh position shows no caption row, only the map's spoken label.
  expect(view.queryByText('Location updated 25s ago')).toBeNull();
  expect(view.getByLabelText('Map. Location updated 25s ago')).toBeTruthy();
});

it('hides the rider when stale but keeps the card', async () => {
  const view = await render(<RiderLiveMap outForDelivery response={{ ...base, rider_location: { ...base.rider_location!, stale: true, age_seconds: 300 } }} fetchedAt={Date.now()} />);
  expect(view.getByText('Live location unavailable · last seen 5 min ago')).toBeTruthy();
});

it('renders nothing when the server says tracking is inactive', async () => {
  const view = await render(<RiderLiveMap outForDelivery response={{ ...base, active: false, rider_location: null, destination: null }} fetchedAt={Date.now()} />);
  expect(view.toJSON()).toBeNull();
});


const isDashed = (line: { props: Record<string, unknown> }) => (line.props.coordinates as unknown[]).length === 2;

it('shows only pins before dispatch, then a rider -> customer line without the store pin', async () => {
  const pickup = { lat: 12.95, lng: 77.58 };
  const route = [{ latitude: 12.95, longitude: 77.58 }, { latitude: 12.97, longitude: 77.59 }];
  const response = { ...base, pickup };
  const view = await render(<RiderLiveMap outForDelivery={false} response={response} route={route} fetchedAt={Date.now()} />);
  expect(view.getByLabelText('Gloceries')).toBeTruthy();
  expect(view.getByLabelText('Delivery address')).toBeTruthy();
  expect(view.queryByLabelText('Your rider')).toBeNull();
  // No line until the order is out for delivery.
  expect(view.queryAllByTestId('tracking-polyline')).toHaveLength(0);

  // The rider (12.98, 77.6) is nowhere near the store's road: dashed line
  // from the scooter to the customer (no new route is requested).
  await view.rerender(<RiderLiveMap outForDelivery response={response} route={route} fetchedAt={Date.now()} />);
  expect(view.getByLabelText('Your rider')).toBeTruthy();
  expect(view.getByLabelText('Delivery address')).toBeTruthy();
  expect(view.queryByLabelText('Gloceries')).toBeNull();
  const lines = view.getAllByTestId('tracking-polyline');
  expect(lines.every(isDashed)).toBe(true);
  expect(lines[0]!.props.coordinates[0].latitude).toBeCloseTo(12.98, 2);
});

it('draws a dashed rider -> customer line when no road route is available', async () => {
  const view = await render(<RiderLiveMap outForDelivery response={base} fetchedAt={Date.now()} />);
  const lines = view.getAllByTestId('tracking-polyline');
  expect(lines.length).toBeGreaterThan(1);
  expect(lines.every(isDashed)).toBe(true);
});

it('starts the road line at the scooter, keeps progress, and falls back to dashes off the road', async () => {
  const pickup = { lat: 12.97, lng: 77.58 };
  const turn = { latitude: 12.97, longitude: 77.585 };
  const destination = { latitude: 12.975, longitude: 77.585 };
  const route = [{ latitude: pickup.lat, longitude: pickup.lng }, turn, destination];
  const at = (latitude: number, longitude: number) => (
    <RiderLiveMap
      outForDelivery
      response={{
        ...base,
        pickup,
        destination: { lat: destination.latitude, lng: destination.longitude },
        rider_location: { ...base.rider_location!, lat: latitude, lng: longitude },
      }}
      route={route}
     
      fetchedAt={Date.now()}
    />
  );
  const solid = () => view.getAllByTestId('tracking-polyline').find(line => !isDashed(line))?.props.coordinates;
  // Each new fix glides along the road for one polling interval; let it land.
  const settle = () => act(() => { jest.advanceTimersByTime(6_000); });
  jest.useFakeTimers();

  const view = await render(at(12.97, 77.582));
  expect(solid()).toHaveLength(4);
  expect(solid()[0]).toEqual({ latitude: 12.97, longitude: 77.582 });
  const firstHeading = view.getByLabelText('Your rider').props.rotation;
  expect(view.getByLabelText('Your rider').props.flat).toBe(true);

  await view.rerender(at(12.973, 77.585));
  await settle();
  // The top-down rider turns to the new road direction (compass degrees).
  expect(view.getByLabelText('Your rider').props.rotation).not.toBeCloseTo(firstHeading);
  expect(view.getByLabelText('Your rider').props.rotation).toBeGreaterThanOrEqual(0);
  expect(view.getByLabelText('Your rider').props.rotation).toBeLessThan(360);
  expect(solid()).toHaveLength(3);

  await view.rerender(at(12.973, 77.59));
  await settle();
  expect(solid()).toBeUndefined();
  expect(view.getAllByTestId('tracking-polyline').every(isDashed)).toBe(true);

  // Back on the road further along: the earlier progress still holds.
  await view.rerender(at(12.974, 77.585));
  await settle();
  expect(solid()).toEqual([{ latitude: 12.974, longitude: 77.585 }, expect.objectContaining({ latitude: expect.closeTo(12.974, 6) }), destination]);
  jest.useRealTimers();
});

it('glides the rider along the road between fixes instead of jumping', async () => {
  jest.useFakeTimers();
  const pickup = { lat: 12.97, lng: 77.58 };
  const turn = { latitude: 12.97, longitude: 77.585 };
  const destination = { latitude: 12.975, longitude: 77.585 };
  const route = [{ latitude: pickup.lat, longitude: pickup.lng }, turn, destination];
  // ~650 m of road, 45 s apart: a believable ~52 km/h ride.
  const at = (latitude: number, longitude: number, updatedAt: string) => (
    <RiderLiveMap outForDelivery route={route} fetchedAt={Date.now()} response={{
      ...base, pickup, destination: { lat: destination.latitude, lng: destination.longitude },
      rider_location: { ...base.rider_location!, lat: latitude, lng: longitude, updated_at: updatedAt },
    }} />
  );
  const rider = () => view.getByLabelText('Your rider').props;
  const view = await render(at(12.97, 77.582, '2026-10-15T10:00:00Z'));
  expect(rider().coordinate).toEqual({ latitude: 12.97, longitude: 77.582 });

  // Next fix is round the corner: halfway through, the rider is still on the
  // road (at or near the turn), never cutting the corner, and the line starts
  // at the drawn rider.
  await view.rerender(at(12.973, 77.585, '2026-10-15T10:00:45Z'));
  // Halfway through the real 45 s between the two fixes.
  await act(() => { jest.advanceTimersByTime(22_000); });
  const mid = rider().coordinate;
  expect(mid.latitude === 12.97 || mid.longitude === 77.585).toBe(true);
  expect(mid).not.toEqual({ latitude: 12.973, longitude: 77.585 });
  const line = view.getAllByTestId('tracking-polyline').find(l => !isDashed(l))!.props.coordinates;
  expect(line[0]).toEqual(mid);

  await act(() => { jest.advanceTimersByTime(24_000); });
  expect(rider().coordinate).toEqual({ latitude: 12.973, longitude: 77.585 });
  jest.useRealTimers();
});

it('snaps instead of gliding when the jump is faster than a scooter (GPS glitch)', async () => {
  jest.useFakeTimers();
  const fix = (lat: number, lng: number, at: string) => (
    <RiderLiveMap outForDelivery fetchedAt={Date.now()} response={{ ...base, rider_location: { ...base.rider_location!, lat, lng, updated_at: at } }} />
  );
  const view = await render(fix(12.98, 77.6, '2026-10-15T10:00:00Z'));
  // ~550 m in 5 s is ~400 km/h: not a real ride, so no glide.
  await view.rerender(fix(12.985, 77.6, '2026-10-15T10:00:05Z'));
  expect(view.getByLabelText('Your rider').props.coordinate).toEqual({ latitude: 12.985, longitude: 77.6 });
  jest.useRealTimers();
});

it('shows the rider heading to the store before pickup with pins only, no route line', async () => {
  const store = { lat: 12.97, lng: 77.58 };
  const roadToStore = [{ latitude: 12.98, longitude: 77.6 }, { latitude: 12.975, longitude: 77.59 }, { latitude: 12.97, longitude: 77.58 }];
  const view = await render(<RiderLiveMap outForDelivery={false} route={roadToStore} fetchedAt={Date.now()} response={{
    ...base, active: true, leg: 'pickup', pickup: store,
  }} />);
  // The rider, the store and the customer's home are all on the map.
  expect(view.getByLabelText('Your rider')).toBeTruthy();
  expect(view.getByLabelText('Gloceries')).toBeTruthy();
  expect(view.getByLabelText('Delivery address')).toBeTruthy();
  // The route is drawn only from out for delivery, not toward the store.
  expect(view.queryAllByTestId('tracking-polyline')).toHaveLength(0);
});

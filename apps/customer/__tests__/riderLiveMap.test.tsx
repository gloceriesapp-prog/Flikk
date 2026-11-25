/* eslint-disable @typescript-eslint/no-require-imports -- Hoisted Jest mocks resolve React and native components at runtime. */
import { render } from '@testing-library/react-native';
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

it('renders the rider and delivery pins with a freshness caption', async () => {
  const view = await render(<RiderLiveMap outForDelivery response={base} fetchedAt={Date.now()} />);
  expect(view.getByText('Location updated 25s ago')).toBeTruthy();
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

it('switches from the store connector to a rider -> customer line and drops the store pin', async () => {
  const pickup = { lat: 12.95, lng: 77.58 };
  const route = [{ latitude: 12.95, longitude: 77.58 }, { latitude: 12.97, longitude: 77.59 }];
  const response = { ...base, pickup };
  const onOffRoute = jest.fn();
  const view = await render(<RiderLiveMap outForDelivery={false} response={response} route={route} fetchedAt={Date.now()} />);
  expect(view.getByLabelText('Gloceries')).toBeTruthy();
  expect(view.getByLabelText('Deliver')).toBeTruthy();
  expect(view.queryByLabelText('Your rider')).toBeNull();
  const dashes = view.getAllByTestId('tracking-polyline');
  expect(dashes.length).toBeGreaterThan(1);
  expect(dashes.every(isDashed)).toBe(true);

  // The rider (12.98, 77.6) is nowhere near the store's road: dashed line
  // from the scooter to the customer, and a fresh route is requested.
  await view.rerender(<RiderLiveMap outForDelivery response={response} route={route} onOffRoute={onOffRoute} fetchedAt={Date.now()} />);
  expect(view.getByLabelText('Your rider')).toBeTruthy();
  expect(view.getByLabelText('Deliver')).toBeTruthy();
  expect(view.queryByLabelText('Gloceries')).toBeNull();
  const lines = view.getAllByTestId('tracking-polyline');
  expect(lines.every(isDashed)).toBe(true);
  expect(lines[0]!.props.coordinates[0].latitude).toBeCloseTo(12.98, 2);
  expect(onOffRoute).toHaveBeenCalled();
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
  const onOffRoute = jest.fn();
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
      onOffRoute={onOffRoute}
      fetchedAt={Date.now()}
    />
  );
  const solid = () => view.getAllByTestId('tracking-polyline').find(line => !isDashed(line))?.props.coordinates;

  const view = await render(at(12.97, 77.582));
  expect(solid()).toHaveLength(4);
  expect(solid()[0]).toEqual({ latitude: 12.97, longitude: 77.582 });
  const eastFacingImage = view.getByLabelText('Your rider').props.image;

  await view.rerender(at(12.973, 77.585));
  expect(view.getByLabelText('Your rider').props.image).not.toEqual(eastFacingImage);
  expect(view.getByLabelText('Your rider').props.rotation).toBeGreaterThan(0);
  expect(solid()).toHaveLength(3);
  expect(onOffRoute).not.toHaveBeenCalled();

  await view.rerender(at(12.973, 77.59));
  expect(solid()).toBeUndefined();
  expect(view.getAllByTestId('tracking-polyline').every(isDashed)).toBe(true);
  expect(onOffRoute).toHaveBeenCalled();

  // Back on the road further along: the earlier progress still holds.
  await view.rerender(at(12.974, 77.585));
  expect(solid()).toEqual([{ latitude: 12.974, longitude: 77.585 }, expect.objectContaining({ latitude: expect.closeTo(12.974, 6) }), destination]);
});

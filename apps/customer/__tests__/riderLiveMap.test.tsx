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


it('switches from the dashed pickup connector to the road route and scooter', async () => {
  const pickup = { lat: 12.95, lng: 77.58 };
  const route = [{ latitude: 12.95, longitude: 77.58 }, { latitude: 12.97, longitude: 77.59 }];
  const response = { ...base, pickup };
  const view = await render(<RiderLiveMap outForDelivery={false} response={response} route={route} fetchedAt={Date.now()} />);
  expect(view.getByLabelText('Gloceries')).toBeTruthy();
  expect(view.getByLabelText('Deliver')).toBeTruthy();
  expect(view.queryByLabelText('Your rider')).toBeNull();
  const dashes = view.getAllByTestId('tracking-polyline');
  expect(dashes.length).toBeGreaterThan(1);
  expect(dashes.every(dash => dash.props.coordinates.length === 2)).toBe(true);

  await view.rerender(<RiderLiveMap outForDelivery response={response} route={route} fetchedAt={Date.now()} />);
  expect(view.getByLabelText('Your rider')).toBeTruthy();
  expect(view.getByTestId('tracking-polyline').props.coordinates).toEqual(route);
});

it('shows only the road ahead and preserves progress through backwards or off-route GPS fixes', async () => {
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

  const view = await render(at(12.97, 77.582));
  const line = () => view.getByTestId('tracking-polyline').props.coordinates;
  expect(line()).toHaveLength(3);
  expect(line()[0].longitude).toBeCloseTo(77.582, 6);
  const eastFacingImage = view.getByLabelText('Your rider').props.image;

  await view.rerender(at(12.973, 77.585));
  expect(view.getByLabelText('Your rider').props.image).not.toEqual(eastFacingImage);
  expect(view.getByLabelText('Your rider').props.rotation).toBeGreaterThan(0);
  const ahead = line();
  expect(ahead).toHaveLength(2);
  expect(ahead[0].latitude).toBeCloseTo(12.973, 6);

  await view.rerender(at(12.97, 77.582));
  expect(line()).toEqual(ahead);
  await view.rerender(at(12.973, 77.59));
  expect(line()).toEqual(ahead);
  expect(view.getByLabelText('Your rider').props.coordinate).toEqual({ latitude: 12.973, longitude: 77.59 });
});

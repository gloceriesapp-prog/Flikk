import { render } from '@testing-library/react-native';
import { RiderLiveMap } from '../src/screens/track-order/components/RiderLiveMap';
import type { RiderLocationResponse } from '../src/api/tracking';
jest.mock('../src/components/AppIcon', () => ({ AppIcon: () => null }));

const base: RiderLocationResponse = {
  active: true,
  destination: { lat: 12.97, lng: 77.59 },
  stale_after_seconds: 180,
  rider_location: { lat: 12.98, lng: 77.6, updated_at: '2026-10-15T10:00:00Z', age_seconds: 25, stale: false },
};

it('renders the rider and delivery pins with a freshness caption', async () => {
  const view = await render(<RiderLiveMap response={base} fetchedAt={Date.now()} />);
  expect(view.getByText('Location updated 25s ago')).toBeTruthy();
  expect(view.getByLabelText('Map. Location updated 25s ago')).toBeTruthy();
});

it('hides the rider when stale but keeps the card', async () => {
  const view = await render(<RiderLiveMap response={{ ...base, rider_location: { ...base.rider_location!, stale: true, age_seconds: 300 } }} fetchedAt={Date.now()} />);
  expect(view.getByText('Live location unavailable · last seen 5 min ago')).toBeTruthy();
});

it('renders nothing when the server says tracking is inactive', async () => {
  const view = await render(<RiderLiveMap response={{ ...base, active: false, rider_location: null, destination: null }} fetchedAt={Date.now()} />);
  expect(view.toJSON()).toBeNull();
});

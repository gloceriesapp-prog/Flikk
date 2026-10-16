import { formatAge, riderMapView } from '../src/screens/track-order/state/riderLocationView';
import type { RiderLocationResponse } from '../src/api/tracking';

const FETCHED = 1_000_000;
const response = (over: Partial<RiderLocationResponse['rider_location']> | null = {}): RiderLocationResponse => ({
  active: true,
  destination: { lat: 12.97, lng: 77.59 },
  stale_after_seconds: 180,
  rider_location: over === null ? null : { lat: 12.98, lng: 77.6, updated_at: '2026-10-15T10:00:00Z', age_seconds: 12, stale: false, ...over },
});

describe('riderMapView', () => {
  it('shows a fresh rider with an age advanced by local elapsed time', () => {
    const view = riderMapView(response(), FETCHED, FETCHED + 8_000);
    expect(view.rider).toEqual({ lat: 12.98, lng: 77.6 });
    expect(view.destination).toEqual({ lat: 12.97, lng: 77.59 });
    expect(view.ageSeconds).toBe(20);
    expect(view.caption).toBe('Location updated 20s ago');
  });

  it('hides the rider marker when the server marks the position stale', () => {
    const view = riderMapView(response({ stale: true, age_seconds: 400 }), FETCHED, FETCHED);
    expect(view.rider).toBeNull();
    expect(view.stale).toBe(true);
    expect(view.destination).not.toBeNull();
    expect(view.caption).toContain('6 min ago');
  });

  it('turns stale locally when polls stop arriving', () => {
    const view = riderMapView(response({ age_seconds: 170 }), FETCHED, FETCHED + 15_000);
    expect(view.rider).toBeNull();
    expect(view.stale).toBe(true);
  });

  it('shows a waiting state with no position', () => {
    const view = riderMapView(response(null), FETCHED, FETCHED);
    expect(view.rider).toBeNull();
    expect(view.ageSeconds).toBeNull();
    expect(view.caption).toMatch(/Waiting/);
  });

  it('handles no response yet', () => {
    expect(riderMapView(undefined, 0, FETCHED)).toMatchObject({ rider: null, destination: null });
  });
});

it('formats ages compactly', () => {
  expect(formatAge(3)).toBe('just now');
  expect(formatAge(42)).toBe('42s ago');
  expect(formatAge(125)).toBe('2 min ago');
});

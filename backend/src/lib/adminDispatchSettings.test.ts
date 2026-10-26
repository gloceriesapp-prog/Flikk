import { describe, expect, it } from 'vitest';
import { parseDispatchSettings } from '../../../apps/admin/src/lib/dispatchSettings';

const valid = { radiusStepsKm: [5, 3, 8], stepSeconds: 45, maxActiveTripsPerRider: null, acceptDelaySeconds: 15 };

describe('admin dispatch settings', () => {
  it('accepts the wait after the store accepts, 0 included', () => {
    expect(parseDispatchSettings(valid)).toEqual({ ok: true, value: { ...valid, radiusStepsKm: [3, 5, 8] } });
    expect(parseDispatchSettings({ ...valid, acceptDelaySeconds: 0 })).toMatchObject({ ok: true, value: { acceptDelaySeconds: 0 } });
  });

  it('refuses a missing, fractional or out-of-range wait, matching the database bound', () => {
    for (const acceptDelaySeconds of [undefined, -1, 601, 7.5, '15']) {
      expect(parseDispatchSettings({ ...valid, acceptDelaySeconds })).toMatchObject({ ok: false });
    }
    expect(parseDispatchSettings({ ...valid, acceptDelaySeconds: 600 })).toMatchObject({ ok: true });
  });
});

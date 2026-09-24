import { describe, expect, it } from 'vitest';
import { decodePolyline } from './routeDirections.js';

// Canonical example from Google's own Encoded Polyline Algorithm Format docs:
// "_p~iF~ps|U_ulLnnqC_mqNvxq`@" decodes to these three points.
describe('decodePolyline', () => {
  it('decodes Google reference example', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(points).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ]);
  });

  it('returns empty for empty input', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

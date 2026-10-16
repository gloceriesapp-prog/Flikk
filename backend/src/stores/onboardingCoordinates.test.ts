import { describe, expect, it } from 'vitest';
import { onboardingCoordinates } from './onboardingCoordinates.js';
describe('final onboarding map pin', () => {
  it('persists explicit coordinates including zero without waiting for draft autosave', () => {
    expect(onboardingCoordinates(0, 0, true)).toEqual({ lat: 0, lng: 0 });
    expect(onboardingCoordinates(13.2, 74.8, true)).toEqual({ lat: 13.2, lng: 74.8 });
  });
  it('allows draft changes with no coordinate changes', () => {
    expect(onboardingCoordinates(undefined, undefined, false)).toEqual({});
  });
  it.each([[undefined, undefined], [13, undefined], [undefined, 74], [null, null], ['13', 74], [NaN, 74], [13, Infinity], [91, 74], [13, -181]])('rejects incomplete or invalid final coordinates %s %s', (lat, lng) => {
    expect(() => onboardingCoordinates(lat, lng, true)).toThrow();
  });
  it('does not allow partial draft coordinates', () => {
    expect(() => onboardingCoordinates(13, undefined, false)).toThrow();
  });
});

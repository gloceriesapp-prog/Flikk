import { expect, it } from 'vitest';
import { approximateOfferAddress, withoutFinishedDeliveryAddress } from './customerLocationPrivacy.js';
const address = { line1: 'Private house 42', landmark: 'Private gate', latitude: 13.223456, longitude: 74.744321, delivery_instructions: 'Private entry code' };
it('offers expose an area without an exact pin, address or instructions', () => {
  const preview = approximateOfferAddress(address);
  expect(preview).toEqual({ line1: 'Approximate delivery area', landmark: null, latitude: 13.22, longitude: 74.74 });
  expect(JSON.stringify(preview)).not.toMatch(/Private|13.223456|74.744321/);
  expect(address.line1).toBe('Private house 42');
});
it('invalid or absent coordinates cannot create misleading delivery previews', () => {
  for (const value of [null, [], {}, { latitude: 91, longitude: 0 }, { latitude: NaN, longitude: 74 }]) expect(approximateOfferAddress(value)).toBeNull();
});
it('only active assignments retain the exact delivery address', () => {
  for (const status of ['placed', 'packed', 'out_for_delivery']) expect(withoutFinishedDeliveryAddress({ status, addresses: address }).addresses).toBe(address);
  for (const status of ['delivered', 'cancelled', 'failed', 'unknown']) expect(withoutFinishedDeliveryAddress({ status, addresses: address }).addresses).toBeNull();
});

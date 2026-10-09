import { describe, expect, it } from 'vitest';
import { isOwnedRiderDocument, validateRiderProfileChanges } from './riderProfileChanges.js';
const user = '00000000-0000-4000-8000-000000000001';
describe('rider reviewed changes', () => {
  it('rejects arbitrary profile fields and empty requests', () => {
    for (const body of [null, [], {}, { is_active: true }, { payout_method: 'upi' }, { licenceNumber: '' }])
      expect(() => validateRiderProfileChanges(body, 'scooter')).toThrow();
  });
  it('requires registration for a motor vehicle and clears it for a bicycle', () => {
    expect(() => validateRiderProfileChanges({ vehicleType: 'motorcycle' }, 'bicycle')).toThrow();
    expect(validateRiderProfileChanges({ vehicleType: 'bicycle' }, 'scooter'))
      .toEqual({ vehicle_type: 'bicycle', vehicle_number: null });
    expect(validateRiderProfileChanges({ vehicleType: 'scooter', vehicleNumber: ' KA 20 AB 1234 ' }, null))
      .toEqual({ vehicle_type: 'scooter', vehicle_number: 'KA 20 AB 1234' });
  });
  it('limits document and registration lengths and only permits known vehicles', () => {
    expect(() => validateRiderProfileChanges({ licenceNumber: 'x'.repeat(31) }, null)).toThrow();
    expect(() => validateRiderProfileChanges({ vehicleType: 'car' }, null)).toThrow();
  });
  it('accepts only an owned private path for the expected document kind', () => {
    const path = `${user}/dl-00000000-0000-4000-8000-000000000002.jpg`;
    expect(isOwnedRiderDocument(path, user, 'dl')).toBe(true);
    expect(isOwnedRiderDocument(path, user, 'aadhaar')).toBe(false);
    expect(isOwnedRiderDocument(path, 'another-user', 'dl')).toBe(false);
    expect(isOwnedRiderDocument(`https://example.com/${path}`, user, 'dl')).toBe(false);
    expect(isOwnedRiderDocument(`${user}/dl-../secret.jpg`, user, 'dl')).toBe(false);
  });
});

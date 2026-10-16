import { describe, expect, it } from 'vitest';
import { validateStoreSettings } from '../../../apps/partner/src/utils/storeSettingsValidation';

const complete = {
  name: 'Neighbourhood shop', category: 'grocery', openTime: '09:00', closeTime: '21:00',
  avgPrepMinutes: 15, manualAddress: '12 Market Road', ownerName: 'Shop Owner',
  panNumber: 'ABCDE1234F', fssaiLicenseNumber: '', drugLicenseNumber: '',
  needsDrugLicense: false, hasLocation: true,
};

describe('partner settings required fields', () => {
  it('allows a complete form without optional licences', () => {
    expect(validateStoreSettings(complete)).toBeNull();
  });
  it.each(['name', 'category', 'openTime', 'closeTime', 'manualAddress', 'ownerName', 'panNumber'] as const)(
    'rejects an empty required %s', key => {
      expect(validateStoreSettings({ ...complete, [key]: '  ' })).not.toBeNull();
    },
  );
  it('requires a real map selection and valid time/preparation values', () => {
    for (const changes of [{ hasLocation: false }, { openTime: '25:00' }, { avgPrepMinutes: NaN }, { avgPrepMinutes: 0 }]) {
      expect(validateStoreSettings({ ...complete, ...changes })).not.toBeNull();
    }
  });
  it('validates an optional FSSAI only when supplied', () => {
    expect(validateStoreSettings({ ...complete, fssaiLicenseNumber: '123' })).not.toBeNull();
    expect(validateStoreSettings({ ...complete, fssaiLicenseNumber: '12345678901234' })).toBeNull();
  });
  it('requires a drug licence only for pharmacy categories', () => {
    expect(validateStoreSettings({ ...complete, needsDrugLicense: true })).not.toBeNull();
    expect(validateStoreSettings({ ...complete, needsDrugLicense: true, drugLicenseNumber: 'DL-123' })).toBeNull();
  });
});

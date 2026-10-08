import { expect, it } from 'vitest';
import { STORE_CATEGORIES as ADMIN_STORE_CATEGORIES } from '../../../apps/admin/src/lib/store-options';
import { assertStoreCategory, normalizeDrugLicense, STORE_CATEGORIES, storeCategoryOptions } from './storeCategories.js';

it('allows exactly the categories the admin panel allows', () => {
  expect([...STORE_CATEGORIES]).toEqual([...ADMIN_STORE_CATEGORIES]);
});

it('flags pharmacy as needing a drug licence', () => {
  expect(storeCategoryOptions().filter((c) => c.requires_drug_license).map((c) => c.name)).toEqual(['Pharmacy']);
});

it('rejects categories admin would reject', () => {
  for (const bad of ['Liquor', '', 'pharmacy', ' Pharmacy', null, 42]) {
    expect(() => assertStoreCategory(bad, null)).toThrow(expect.objectContaining({ status: 400, code: 'INVALID_CATEGORY' }));
  }
  expect(() => assertStoreCategory('Others', null)).not.toThrow();
});

it('requires a drug licence for pharmacy only', () => {
  expect(() => assertStoreCategory('Pharmacy', null)).toThrow(expect.objectContaining({ code: 'DRUG_LICENSE_REQUIRED' }));
  expect(() => assertStoreCategory('Pharmacy', 'KA-UDP-20B-123')).not.toThrow();
  expect(() => assertStoreCategory('Bakery', null)).not.toThrow();
});

it('normalizes the licence text', () => {
  expect(normalizeDrugLicense('  KA-1 ')).toBe('KA-1');
  expect(normalizeDrugLicense('   ')).toBeNull();
  expect(normalizeDrugLicense(undefined)).toBeNull();
  expect(() => normalizeDrugLicense(5)).toThrow();
  expect(() => normalizeDrugLicense('x'.repeat(101))).toThrow();
});

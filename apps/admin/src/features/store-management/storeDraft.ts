import { editableStoreTime } from './storeTime';
import type { Store } from '../../lib/types';
import type { StorePatchInput } from './storePatch';
export type StoreDraft = Record<string, string | boolean>;
export const numericFields = new Set(['lat', 'lng', 'deliveryRadiusKm', 'avgPrepMinutes']);
export function storeDraft(store: Store): StoreDraft {
  return {
    name: store.name, category: store.category, ownerName: store.ownerName, phone: store.phone,
    addressLine: store.addressLine, manualAddress: store.manualAddress ?? '', district: store.district,
    city: store.city, state: store.state, country: store.country, photoUrl: store.photoUrl ?? '',
    openTime: editableStoreTime(store.openTime), closeTime: editableStoreTime(store.closeTime), isActive: store.isActive,
    lat: store.lat?.toString() ?? '', lng: store.lng?.toString() ?? '', deliveryRadiusKm: store.deliveryRadiusKm?.toString() ?? '',
    avgPrepMinutes: store.avgPrepMinutes?.toString() ?? '', fssaiNumber: store.fssaiNumber,
    shopEstablishmentNumber: store.shopEstablishmentNumber, panNumber: store.panNumber, aadhaarLast4: store.aadhaarLast4,
    bankName: store.bankName, bankAccountLast4: store.bankAccountLast4, gstNumber: store.gstNumber ?? '',
    udyamNumber: store.udyamNumber ?? '', drugLicenseNumber: store.drugLicenseNumber ?? '',
    turnoverExceedsGstThreshold: store.turnoverExceedsGstThreshold,
  };
}
export function changedStoreFields(draft: StoreDraft, saved: StoreDraft): StorePatchInput {
  const patch: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(draft)) {
    if (value === saved[key]) continue;
    patch[key] = numericFields.has(key) ? String(value).trim() ? Number(value) : null : value;
  }
  return patch as StorePatchInput;
}

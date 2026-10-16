import { isValidFssaiFormat, isValidPanFormat } from './documentValidation';
import { normalizeStoreHour } from './storeHours';

interface StoreSettingsValues {
  name: string;
  category: string;
  openTime: string;
  closeTime: string;
  avgPrepMinutes: number;
  manualAddress: string;
  ownerName: string;
  panNumber: string;
  fssaiLicenseNumber: string;
  drugLicenseNumber: string;
  needsDrugLicense: boolean;
  hasLocation: boolean;
}

// Validate the complete settings form; partial API updates and photo uploads
// remain independent. Optional documents are checked only when supplied.
export function validateStoreSettings(values: StoreSettingsValues): string | null {
  if (!values.name.trim()) return 'Enter your store name.';
  if (!values.category.trim()) return 'Choose a store category.';
  if (!values.openTime.trim() || !values.closeTime.trim()
      || normalizeStoreHour(values.openTime) === null || normalizeStoreHour(values.closeTime) === null) {
    return 'Enter valid opening and closing times.';
  }
  if (!Number.isFinite(values.avgPrepMinutes) || values.avgPrepMinutes < 5 || values.avgPrepMinutes > 60) {
    return 'Set preparation time between 5 and 60 minutes.';
  }
  if (!values.hasLocation) return 'Choose your store location on the map.';
  if (!values.manualAddress.trim()) return 'Enter your full shop address.';
  if (!values.ownerName.trim()) return 'Enter the owner’s full name.';
  if (!isValidPanFormat(values.panNumber)) return 'Enter a valid PAN, such as ABCDE1234F.';
  if (values.fssaiLicenseNumber.trim() && !isValidFssaiFormat(values.fssaiLicenseNumber)) return 'FSSAI must contain 14 digits.';
  if (values.needsDrugLicense && !values.drugLicenseNumber.trim()) return 'Enter your pharmacy’s drug licence number.';
  return null;
}

// Write-side validation for the admin "App settings" page (migration 112:
// app_release_config + app_faqs). Mirrors that migration's CHECKs so a bad
// value gets a readable message instead of a database error. Pure, so the
// backend's vitest suite exercises it too (backend/src/routes/appConfig.test.ts).

export const RELEASE_APPS = ['customer', 'partner', 'rider'] as const;
export type ReleaseApp = (typeof RELEASE_APPS)[number];

const VERSION = /^\d{1,4}(\.\d{1,4}){0,3}$/;

export interface ReleaseInput {
  app?: unknown;
  minSupportedVersion?: unknown;
  latestVersion?: unknown;
  iosStoreUrl?: unknown;
  androidStoreUrl?: unknown;
  forceUpdate?: unknown;
  maintenanceEnabled?: unknown;
  maintenanceMessage?: unknown;
}

export function compareVersions(a: string, b: string): number {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

function storeUrl(value: unknown, label: string): string | null {
  if (value == null || (typeof value === 'string' && !value.trim())) return null;
  if (typeof value !== 'string' || !/^https:\/\/\S+$/i.test(value.trim()) || value.trim().length > 500) {
    throw new Error(`${label} must be an https:// link.`);
  }
  return value.trim();
}

export function validateReleaseInput(input: ReleaseInput) {
  const app = input.app as ReleaseApp;
  if (!RELEASE_APPS.includes(app)) throw new Error('Choose the customer, partner or rider app.');
  const min = typeof input.minSupportedVersion === 'string' ? input.minSupportedVersion.trim() : '';
  const latest = typeof input.latestVersion === 'string' ? input.latestVersion.trim() : '';
  if (!VERSION.test(min)) throw new Error('Minimum supported version must look like 1.2.0.');
  if (!VERSION.test(latest)) throw new Error('Latest version must look like 1.2.0.');
  if (compareVersions(min, latest) > 0) throw new Error('Minimum supported version cannot be newer than the latest version.');
  const maintenanceMessage = typeof input.maintenanceMessage === 'string' && input.maintenanceMessage.trim() ? input.maintenanceMessage.trim() : null;
  if (maintenanceMessage && maintenanceMessage.length > 500) throw new Error('Maintenance message must be 500 characters or fewer.');
  const row = {
    app,
    min_supported_version: min,
    latest_version: latest,
    ios_store_url: storeUrl(input.iosStoreUrl, 'App Store link'),
    android_store_url: storeUrl(input.androidStoreUrl, 'Play Store link'),
    force_update: input.forceUpdate === true,
    maintenance_enabled: input.maintenanceEnabled === true,
    maintenance_message: maintenanceMessage,
  };
  if ((row.force_update || compareVersions(min, '0.0.0') > 0) && !row.ios_store_url && !row.android_store_url) {
    throw new Error('Add a store link so customers can update.');
  }
  return row;
}

export interface FaqInput { question?: unknown; answer?: unknown; sortOrder?: unknown; isActive?: unknown }

export function validateFaqInput(input: FaqInput) {
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  const answer = typeof input.answer === 'string' ? input.answer.trim() : '';
  if (question.length < 1 || question.length > 300) throw new Error('Question must be 1 to 300 characters.');
  if (answer.length < 1 || answer.length > 4000) throw new Error('Answer must be 1 to 4000 characters.');
  const sortOrder = input.sortOrder === undefined ? 0 : Number(input.sortOrder);
  if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 100000) throw new Error('Order must be a whole number.');
  return { question, answer, sort_order: sortOrder, is_active: input.isActive !== false };
}

// App version / maintenance gate shared by the customer, partner and rider
// apps. The backend serves each app's release config (app_release_config,
// migration 112, edited on admin "App settings") at GET
// /app-config/release/:app; each app compares its own version against it.
// Pure: no React, no fetch.

export type ReleaseApp = 'customer' | 'partner' | 'rider';

export interface AppRelease {
  minSupportedVersion: string;
  latestVersion: string;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  forceUpdate: boolean;
  maintenance: { enabled: boolean; message: string | null };
}

export type ReleaseGate =
  | { kind: 'ok' }
  | { kind: 'maintenance'; message: string }
  | { kind: 'update-required'; storeUrl: string | null }
  | { kind: 'update-available'; latestVersion: string; storeUrl: string | null };

export const DEFAULT_MAINTENANCE_MESSAGE = 'We are making some improvements. Please check back shortly.';

// Dotted numeric versions ("1.2.10"); missing parts count as 0. Anything
// unparseable compares as equal, so a malformed version never blocks.
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => (/^\d+(\.\d+)*$/.test(v.trim()) ? v.trim().split('.').map(Number) : null);
  const x = parse(a);
  const y = parse(b);
  if (!x || !y) return 0;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// Accepts the backend's JSON; anything malformed degrades to "no gate".
export function parseRelease(value: unknown): AppRelease | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  const maintenance = (r.maintenance && typeof r.maintenance === 'object' ? r.maintenance : {}) as Record<string, unknown>;
  const https = (v: unknown) => { const t = text(v); return t && /^https:\/\//i.test(t) ? t : null; };
  return {
    minSupportedVersion: text(r.minSupportedVersion) ?? '0.0.0',
    latestVersion: text(r.latestVersion) ?? '0.0.0',
    iosStoreUrl: https(r.iosStoreUrl),
    androidStoreUrl: https(r.androidStoreUrl),
    forceUpdate: r.forceUpdate === true,
    maintenance: { enabled: maintenance.enabled === true, message: text(maintenance.message) },
  };
}

// Maintenance wins, then a required update (below the minimum, or below
// latest when force update is on), then an optional update.
export function releaseGate(release: AppRelease | null, currentVersion: string | null | undefined, platform: string): ReleaseGate {
  if (!release) return { kind: 'ok' };
  if (release.maintenance.enabled) return { kind: 'maintenance', message: release.maintenance.message ?? DEFAULT_MAINTENANCE_MESSAGE };
  const version = currentVersion ?? '';
  const storeUrl = platform === 'ios' ? release.iosStoreUrl : platform === 'android' ? release.androidStoreUrl : release.androidStoreUrl ?? release.iosStoreUrl;
  const required = release.forceUpdate && compareVersions(release.latestVersion, release.minSupportedVersion) > 0
    ? release.latestVersion : release.minSupportedVersion;
  if (compareVersions(version, required) < 0) return { kind: 'update-required', storeUrl };
  if (compareVersions(version, release.latestVersion) < 0) return { kind: 'update-available', latestVersion: release.latestVersion, storeUrl };
  return { kind: 'ok' };
}

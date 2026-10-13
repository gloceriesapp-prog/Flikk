// Installed-app discovery is only for the customer's payment preference.
// Razorpay's native checkout owns app launching and the payment payload.
import { Linking, NativeModules, Platform } from 'react-native';
import { UPI_APPS, type UpiApp } from './upiApps';

export interface NativeUpiApp {
  name: string;
  packageName: string;
  className: string;
  icon: string; // base64 PNG, no data: prefix
}

// Android PackageManager results scoped to upiApps.ts's known list — the raw
// query matches ANY app declaring the `upi://` intent-filter, and real device
// testing turned up apps that register it for unrelated deep-linking (a
// shopping app, a phone-case storefront), not actual UPI payments.
export function matchNativeUpiApps(detected: NativeUpiApp[]): UpiApp[] {
  const byPackage = new Map(detected.map((app) => [app.packageName, app]));
  return UPI_APPS.filter((known) => byPackage.has(known.androidPackage)).map((known) => {
    const native = byPackage.get(known.androidPackage)!;
    return { ...known, iconUri: `data:image/png;base64,${native.icon}` };
  });
}

async function detectByScheme(): Promise<UpiApp[]> {
  const checks = await Promise.all(
    UPI_APPS.map((app) => Linking.canOpenURL(`${app.scheme}://`).catch(() => false)),
  );
  return UPI_APPS.filter((_, i) => checks[i]);
}

// Not cached module-wide — installed apps can change between app
// launches (install/uninstall), and this is cheap enough to redo per
// checkout visit.
export async function detectInstalledUpiApps(): Promise<UpiApp[]> {
  if (Platform.OS === 'android') {
    const upiAppsModule = NativeModules.UpiApps as { getInstalledUpiApps(): Promise<NativeUpiApp[]> } | undefined;
    // Older dev-client without the native module: per-scheme canOpenURL
    // (scheme <queries> are declared by plugins/withUpiAppQueries.js).
    if (!upiAppsModule) return detectByScheme();
    try {
      return matchNativeUpiApps(await upiAppsModule.getInstalledUpiApps());
    } catch {
      return [];
    }
  }
  return detectByScheme();
}

// Detects which UPI apps are installed, and launches the real
// `upi://pay?...` link a checkout got from POST /payments/create-upi-
// intent at one of them directly — no Razorpay-branded screen, same
// mechanism Blinkit/Instamart use for their own in-app UPI grid.
//
// Android: fully dynamic, via a hand-written native module
// (android/app/.../upiapps/UpiAppsModule.kt) that queries PackageManager
// for every app declaring the standard NPCI upi:// intent-filter — real
// name, real package, real launcher icon, not limited to a hardcoded
// list. (The published npm package this was modeled after,
// react-native-upi-apps@1.0.0, builds each app's info map and never
// actually pushes it into the result array — always silently resolves
// empty. Read its source before reaching for it; this module is the
// fixed version of the same idea.)
//
// iOS has no equivalent enumeration API — Apple only allows checking
// named schemes one at a time (LSApplicationQueriesSchemes), so iOS
// detection falls back to upiApps.ts's static known-app list.
//
// Both platforms depend on Android's <queries> manifest / iOS's
// LSApplicationQueriesSchemes for this to work at all — see
// plugins/withUpiAppQueries.js and app.config.js.

import { Linking, NativeModules, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { UPI_APPS, type UpiApp } from './upiApps';

interface NativeUpiApp {
  name: string;
  packageName: string;
  className: string;
  icon: string; // base64 PNG, no data: prefix
}

// Not cached module-wide — installed apps can change between app
// launches (install/uninstall), and this is cheap enough to redo per
// checkout visit.
export async function detectInstalledUpiApps(): Promise<UpiApp[]> {
  if (Platform.OS === 'android') {
    const upiAppsModule = NativeModules.UpiApps as { getInstalledUpiApps(): Promise<NativeUpiApp[]> } | undefined;
    if (!upiAppsModule) return []; // dev-client build predates this native module — falls back to "More payment options"
    try {
      const detected = await upiAppsModule.getInstalledUpiApps();
      // Filtered to upiApps.ts's known list, not shown as-is — the raw
      // PackageManager query matches ANY app declaring the `upi://`
      // intent-filter, and real device testing turned up apps that
      // register it for unrelated internal deep-linking (a shopping app,
      // a phone-case storefront), not actual UPI payments. This keeps
      // detection genuinely dynamic (only shows what's actually
      // installed) while scoping results to real, popular payment apps.
      const byPackage = new Map(detected.map((app) => [app.packageName, app]));
      return UPI_APPS.filter((known) => byPackage.has(known.androidPackage)).map((known) => {
        const native = byPackage.get(known.androidPackage)!;
        return { ...known, iconUri: `data:image/png;base64,${native.icon}`, androidClassName: native.className };
      });
    } catch {
      return [];
    }
  }

  const checks = await Promise.all(
    UPI_APPS.map((app) => Linking.canOpenURL(`${app.scheme}://`).catch(() => false)),
  );
  return UPI_APPS.filter((_, i) => checks[i]);
}

// Android: an explicit intent naming the app's own package, still
// carrying the untouched `upi://pay?...` URI — every UPI PSP app
// declares an intent-filter for the generic `upi` scheme (the NPCI
// spec), so Android hands it to exactly that package regardless of the
// app's own custom scheme. This is the real, reliable mechanism; there's
// no equivalent "pick this one app" API on iOS.
//
// iOS: no way to force a specific installed app to handle a generic URI
// — Linking.openURL on the untouched link is the most both Apple and
// Razorpay actually support. With exactly one UPI app installed it opens
// directly (the common case); with several, iOS shows its own native
// disambiguation sheet. Razorpay's own docs explicitly warn against
// rewriting the link for any platform — this never does, on either.
export async function openUpiApp(app: UpiApp, upiLink: string): Promise<void> {
  // packageName alone does nothing here — expo-intent-launcher's own
  // IntentLauncherModule.kt only sets Intent.component (component =
  // ComponentName(packageName, className)) when className is ALSO given;
  // without it the intent stays a plain generic ACTION_VIEW and Android
  // resolves it against every matching app, showing its own "Open with"
  // chooser instead of jumping straight into the one app actually tapped.
  // androidClassName comes from detectInstalledUpiApps' own real
  // PackageManager query (UpiAppsModule.kt) — always present together
  // with iconUri for anything Android detected, since both are set in
  // that same mapping step.
  if (Platform.OS === 'android' && app.androidClassName) {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: upiLink,
      packageName: app.androidPackage,
      className: app.androidClassName,
    });
    return;
  }
  await Linking.openURL(upiLink);
}

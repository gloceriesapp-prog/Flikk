// Detects which UPI apps are installed, and launches the real UPI link a
// checkout got from POST /payments/upi/intent (Cashfree Order Pay, channel
// 'link') at one of them directly — same mechanism Blinkit/Instamart use for
// their own in-app UPI grid.
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
import type { UpiIntentLinks } from '../api/payments';

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
    return { ...known, iconUri: `data:image/png;base64,${native.icon}`, androidClassName: native.className };
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

// Android: an explicit intent naming the app's own package, still
// carrying the untouched `upi://pay?...` URI — every UPI PSP app
// declares an intent-filter for the generic `upi` scheme (the NPCI
// spec), so Android hands it to exactly that package regardless of the
// app's own custom scheme. This is the real, reliable mechanism; there's
// no equivalent "pick this one app" API on iOS.
//
// iOS: the generic upi:// link is handed to an arbitrary installed handler,
// ignoring the app the customer tapped — so iOS launches iosUpiLink(), the
// same link with only the scheme prefix swapped (query string untouched).
// iOS: swap only the `upi://` prefix for the chosen app's own scheme so the
// tapped app (not iOS's arbitrary handler) opens. The payload is untouched.
export function iosUpiLink(app: UpiApp, upiLink: string): string {
  if (!upiLink.startsWith('upi://')) throw new Error('Unexpected UPI link.');
  return app.iosUpiPrefix + upiLink.slice('upi://'.length);
}

// Checked BEFORE creating a UPI intent payment so an app that cannot open
// goes straight to Cashfree checkout instead of a dangling intent attempt.
export async function canLaunchUpiApp(app: UpiApp): Promise<boolean> {
  if (Platform.OS === 'android') return true;
  return Linking.canOpenURL(iosUpiLink(app, 'upi://pay')).catch(() => false);
}

export type UpiLaunchStep = { kind: 'android-intent' | 'url'; url: string };

// Ordered launch attempts for the tapped app; the caller falls back to
// Cashfree SDK checkout when every step fails.
//  - Android: explicit intent at the app's package with the generic link
//    (every PSP handles `upi://` per the NPCI spec), then the plain default
//    link (system chooser).
//  - iOS: Cashfree's own per-app link if returned, else the default link
//    with the app's scheme prefix swapped, then the plain default link.
export function upiLaunchPlan(app: UpiApp, links: UpiIntentLinks, os: string): UpiLaunchStep[] {
  const steps: UpiLaunchStep[] = [];
  if (os === 'android') {
    if (app.androidClassName) steps.push({ kind: 'android-intent', url: links.default });
  } else {
    const own = links[app.id];
    if (own) steps.push({ kind: 'url', url: own });
    if (links.default.startsWith('upi://')) steps.push({ kind: 'url', url: iosUpiLink(app, links.default) });
  }
  steps.push({ kind: 'url', url: links.default });
  return steps.filter((step, i) => steps.findIndex((other) => other.url === step.url && other.kind === step.kind) === i);
}

// Returns false when nothing could be opened (caller → Cashfree checkout).
export async function openUpiApp(app: UpiApp, links: UpiIntentLinks): Promise<boolean> {
  for (const step of upiLaunchPlan(app, links, Platform.OS)) {
    try {
      if (step.kind === 'android-intent') {
        // className is required: expo-intent-launcher only sets
        // Intent.component when both are given; without it Android shows its
        // "Open with" chooser instead of jumping straight into the tapped app.
        // startActivityAsync resolves only when the customer comes back, so
        // don't wait for it: a launch failure (no such activity) rejects
        // almost immediately; anything still pending after 1s has opened.
        const launched = await Promise.race([
          IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: step.url, packageName: app.androidPackage, className: app.androidClassName,
          }).then(() => true, () => false),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 1000)),
        ]);
        if (launched) return true;
        continue;
      }
      if (Platform.OS === 'ios' && !(await Linking.canOpenURL(step.url))) continue;
      await Linking.openURL(step.url);
      return true;
    } catch { /* try the next step */ }
  }
  return false;
}

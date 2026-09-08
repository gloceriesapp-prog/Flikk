// On Android, UpiAppsModule.kt queries PackageManager for every app
// declaring the standard NPCI UPI intent-filter — but that query alone
// isn't scoped to *payment* apps specifically, some apps register a
// generic `upi://` scheme for unrelated internal deep-linking and get
// swept up in the same result (real device testing surfaced two: a
// shopping app and a case-cover storefront, neither of which is a UPI
// app). payments/upiIntent.ts filters Android's dynamic result down to
// this list's androidPackage values — still genuinely detects whichever
// of *these* are actually installed, not fabricated, just scoped to
// real, popular UPI apps instead of anything that happens to match the
// scheme.
//
// This list is the ONLY source on iOS, which has no enumeration API at
// all — Apple only lets an app check named schemes one at a time
// (LSApplicationQueriesSchemes, app.config.js), so iOS detection is
// necessarily limited to apps named here. Adding one means updating
// app.config.js's LSApplicationQueriesSchemes too, or iOS detection
// silently returns false for it regardless of whether it's installed.
export interface UpiApp {
  id: string;
  name: string;
  // Real base64 PNG from the device's own PackageManager — Android only
  // (UpiAppsModule.kt). Undefined on iOS, where there's no equivalent way
  // to fetch another app's icon; falls back to a plain colored badge.
  iconUri?: string;
  // Custom URL scheme the app registers — iOS detection (Linking.
  // canOpenURL) and launch both use this; Android instead targets
  // androidPackage explicitly via an intent (payments/upiIntent.ts).
  scheme: string;
  androidPackage: string;
  color: string;
}

export const UPI_APPS: UpiApp[] = [
  { id: 'gpay', name: 'Google Pay', scheme: 'tez', androidPackage: 'com.google.android.apps.nbu.paisa.user', color: '#4285F4' },
  { id: 'phonepe', name: 'PhonePe', scheme: 'phonepe', androidPackage: 'com.phonepe.app', color: '#5F259F' },
  { id: 'paytm', name: 'Paytm', scheme: 'paytmmp', androidPackage: 'net.one97.paytm', color: '#00BAF2' },
  { id: 'bhim', name: 'BHIM', scheme: 'bhim', androidPackage: 'in.org.npci.upiapp', color: '#00A651' },
  { id: 'cred', name: 'CRED', scheme: 'credpay', androidPackage: 'com.dreamplug.androidapp', color: '#1C1C1E' },
  { id: 'whatsapp', name: 'WhatsApp', scheme: 'whatsapp', androidPackage: 'com.whatsapp', color: '#25D366' },
];

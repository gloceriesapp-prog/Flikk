// Android 11+ (API 30+) package visibility: an app can't see whether
// another specific package is installed, or explicitly target it with an
// intent, unless it's declared in a <queries> block — silently returns
// "not installed"/fails to resolve otherwise, no error, just wrong
// behavior. Two separate concerns here:
//   - A package-name list, for openUpiApp's explicit-package launch
//     (payments/upiIntent.ts) — needs to name each target app it might
//     ever launch.
//   - A generic upi:// scheme intent query, for UpiAppsModule.kt's
//     PackageManager.queryIntentActivities detection — this is what
//     makes detection see EVERY installed UPI app (any app declaring the
//     standard NPCI intent-filter), not just the four named below.
//     Without this specific entry, that query silently returns empty.
//
// iOS has the equivalent restriction but a different mechanism, and no
// generic-scheme equivalent — LSApplicationQueriesSchemes in Info.plist
// (already set directly in app.config.js, plain JSON, no plugin needed)
// only ever covers named apps, one by one.
const { withAndroidManifest } = require('@expo/config-plugins');

const UPI_PACKAGES = [
  'com.google.android.apps.nbu.paisa.user', // Google Pay
  'com.phonepe.app', // PhonePe
  'net.one97.paytm', // Paytm
  'in.org.npci.upiapp', // BHIM
  'com.dreamplug.androidapp', // CRED
  'com.whatsapp', // WhatsApp
];

module.exports = function withUpiAppQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.queries = manifest.queries ?? [];
    manifest.queries.push({
      package: UPI_PACKAGES.map((name) => ({ $: { 'android:name': name } })),
    });
    manifest.queries.push({
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': 'upi' } }],
        },
      ],
    });
    return config;
  });
};

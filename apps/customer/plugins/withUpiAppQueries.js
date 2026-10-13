// Package visibility for installed UPI app preference discovery. Razorpay's
// SDK performs payment hand-off; no app payment URLs are built here.
const { withAndroidManifest } = require('@expo/config-plugins');

// App schemes (payments/upiApps.ts `scheme`) — lets Linking.canOpenURL work as
// the detection fallback when the UpiApps native module is missing.
const UPI_SCHEMES = ['tez', 'phonepe', 'paytmmp', 'bhim', 'credpay', 'amazonpay', 'whatsapp'];

const UPI_PACKAGES = [
  'com.google.android.apps.nbu.paisa.user', // Google Pay
  'com.phonepe.app', // PhonePe
  'net.one97.paytm', // Paytm
  'in.org.npci.upiapp', // BHIM
  'com.dreamplug.androidapp', // CRED
  'in.amazon.mShop.android.shopping', // Amazon Pay
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
        ...UPI_SCHEMES.map((scheme) => ({
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': scheme } }],
        })),
      ],
    });
    return config;
  });
};

/* global __dirname */
const { validateApiUrl } = require('../../packages/shared/config/api-url.cjs');
const { googleServicesFile: resolveGoogleServicesFile } = require('../../packages/shared/config/google-services.cjs');
const { resolveNativeMapKeys } = require('../../packages/shared/config/google-maps.cjs');
const buildProfile = process.env.EAS_BUILD_PROFILE;
const developmentApi = buildProfile ? buildProfile.startsWith('development') : process.env.NODE_ENV !== 'production' && process.env.APP_ENV !== 'production';
// eas-cli evaluates this file on the developer's machine *before* it pulls the
// EAS environment variables (it needs extra.eas.projectId first), so a release
// profile has no EXPO_PUBLIC_API_URL there yet. Enforce the HTTPS release URL
// on the EAS builder (EAS_BUILD=true), where the real bundle is produced. The
// local pre-read is skipped entirely: it may see a developer's LAN URL from
// .env.local, which never reaches the builder (it is not committed).
if (developmentApi || process.env.EAS_BUILD === 'true') {
  validateApiUrl(process.env.EXPO_PUBLIC_API_URL, developmentApi);
}

// Dynamic config (not app.json) so the Google Maps keys come from env vars,
// never hardcoded into a file that gets committed. Expo CLI auto-loads
// .env/.env.local into process.env before evaluating this file (no dotenv
// dependency needed) — see .env.example for both var names. iOS needs no
// key to run at all (react-native-maps falls back to Apple Maps there) —
// IOS_GOOGLE_MAPS_API_KEY is optional; once it's set, a fresh native build
// (this is native config, not OTA-able) switches iOS to real Google Maps.

const { androidGoogleMapsApiKey, iosGoogleMapsApiKey } = resolveNativeMapKeys(process.env);

// EAS project @nishal777/customer. Not a secret: it ties builds, OTA updates
// and Expo push tokens to this project, so it's fixed here (same shape as
// apps/partner/app.config.js) rather than read from env — a build can never
// ship without it.
const easProjectId = 'a98e9f05-620b-4efb-8624-99d724667e7c';

// Android push (FCM) config, shared by all three apps — see
// packages/shared/config/google-services.cjs.
const googleServicesFile = resolveGoogleServicesFile(__dirname, 'com.gloceries.customer');

module.exports = {
  expo: {
    name: 'Gloceries',
    // Slug stays 'customer': it is bound to extra.eas.projectId below —
    // renaming it would detach the EAS project (builds/updates/credentials).
    slug: 'customer',
    scheme: 'gloceries',
    version: '1.0.4',
    // OTA updates only reach builds with the same runtime version, so a JS
    // update can never land on a binary missing the native code it needs.
    // Bump `version` whenever native modules change (mirrors apps/partner).
    runtimeVersion: { policy: 'appVersion' },
    updates: {
      url: `https://u.expo.dev/${easProjectId}`, fallbackToCacheTimeout: 0,
      ...(process.env.CUSTOMER_DIRECT_ANDROID_RELEASE === 'true' ? { requestHeaders: { 'expo-channel-name': 'production' } } : {}),
    },
    orientation: 'portrait',
    // Brand placeholders (lime + Gilroy "g", generated) — replace with designer assets before store listing.
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.gloceries.customer',
      infoPlist: {
        // expo-status-bar uses React Native's application-level controller.
        // Keep native-stack statusBar options unset to avoid competing owners.
        UIViewControllerBasedStatusBarAppearance: false,
        NSLocationWhenInUseUsageDescription: 'Gloceries uses your location to find stores near you and set your delivery address.',
        // Installed-app discovery plus Razorpay's documented iOS UPI schemes.
        // The native checkout owns secure app hand-off.
        LSApplicationQueriesSchemes: ['upi', 'tez', 'phonepe', 'paytmmp', 'bhim', 'credpay', 'amazonpay', 'whatsapp',
          'navipay', 'mobikwik', 'myairtel', 'popclubapp', 'super', 'kiwi', 'simplypayupi'],
        ITSAppUsesNonExemptEncryption: false,
      },
      // Undefined (key omitted from .env.local) is a valid, supported state
      // — Expo's own config schema just skips Google Maps setup on iOS
      // when this is absent, same as Android would if GOOGLE_MAPS_API_KEY
      // were unset.
      // Spread, not `config: undefined`: an own key holding undefined crashes
      // Expo's iOS Info.plist mod ('usesNonExemptEncryption' in undefined).
      ...(iosGoogleMapsApiKey ? { config: { googleMapsApiKey: iosGoogleMapsApiKey } } : {}),
    },
    android: {
      package: 'com.gloceries.customer',
      versionCode: process.env.CUSTOMER_DIRECT_ANDROID_RELEASE === 'true'
        ? require('./scripts/release-config.cjs').productionVersionCode(process.env)
        : 11,
      googleServicesFile,
      adaptiveIcon: {
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/android-icon-foreground.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      // 'pan' — Android's default ('resize') shrinks the whole window when
      // the keyboard opens, which squished/cropped the hero background
      // image (LoginScreen.tsx). 'pan' leaves the window (and the image)
      // untouched; LoginScreen.tsx's own KeyboardAvoidingView (behavior
      // 'position', wrapping only the bottom sheet) is fully responsible
      // for moving the phone input above the keyboard.
      softwareKeyboardLayoutMode: 'pan',
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      blockedPermissions: ['com.google.android.gms.permission.AD_ID'],
      config: {
        googleMaps: {
          apiKey: androidGoogleMapsApiKey,
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      './plugins/withAndroidReleaseQuality.cjs',
      ['@sentry/react-native/expo', {
        ...(process.env.SENTRY_ORG ? { organization: process.env.SENTRY_ORG } : {}),
        ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
      }],
      '@react-native-community/datetimepicker',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Gloceries uses your location to find stores near you and set your delivery address.',
        },
      ],
      [
        'expo-speech-recognition',
        {
          microphonePermission: 'Gloceries uses your microphone so you can search by voice.',
          speechRecognitionPermission: 'Gloceries uses speech recognition to turn what you say into a search.',
          androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
        },
      ],
      'expo-font',
      ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#FFFFFF' }],
      'expo-image',
      'expo-notifications',
      './plugins/withUpiAppQueries',
      './plugins/withUpiAppsModule',
    ],
    extra: {
      eas: {
        projectId: easProjectId,
      },
      // A boolean, never the key itself — LocationSearchScreen.tsx reads
      // this (via expo-constants) to decide whether iOS gets real Google
      // Maps + the same grayscale style Android already uses, or falls
      // back to Apple Maps' own muted style. Flips automatically the next
      // time this key is set + a fresh native build ships — no code change
      // needed in that file when the real key finally exists.
      hasIosGoogleMaps: Boolean(iosGoogleMapsApiKey),
    },
    owner: 'nishal777',
  },
};

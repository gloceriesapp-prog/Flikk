/* global __dirname */
const { validateApiUrl } = require('../../packages/shared/config/api-url.cjs');
const { googleServicesFile: resolveGoogleServicesFile } = require('../../packages/shared/config/google-services.cjs');
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

const iosGoogleMapsApiKey = process.env.IOS_GOOGLE_MAPS_API_KEY;

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
    version: '1.0.0',
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
        // Our UPI app list (payments/upiApps.ts) + Cashfree SDK's documented
        // UPI schemes, so both our detection and Cashfree checkout can see them.
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
      googleServicesFile,
      adaptiveIcon: {
        backgroundColor: '#A8D93A',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
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
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      ...(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT ? [['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }]] : []),
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
      ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#A8D93A' }],
      'expo-image',
      'expo-notifications',
      './plugins/withUpiAppQueries',
      './plugins/withUpiAppsModule',
    ],
    extra: {
      eas: {
        projectId: 'a98e9f05-620b-4efb-8624-99d724667e7c',
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

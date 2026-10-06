const { validateApiUrl } = require('../../packages/shared/config/api-url.cjs');
const buildProfile = process.env.EAS_BUILD_PROFILE;
const developmentApi = buildProfile ? buildProfile.startsWith('development') : process.env.NODE_ENV !== 'production' && process.env.APP_ENV !== 'production';
validateApiUrl(process.env.EXPO_PUBLIC_API_URL, developmentApi);

// Dynamic config (not app.json) so the Google Maps keys come from env vars,
// never hardcoded into a file that gets committed. Expo CLI auto-loads
// .env/.env.local into process.env before evaluating this file (no dotenv
// dependency needed) — see .env.example for both var names. iOS needs no
// key to run at all (react-native-maps falls back to Apple Maps there) —
// IOS_GOOGLE_MAPS_API_KEY is optional; once it's set, a fresh native build
// (this is native config, not OTA-able) switches iOS to real Google Maps.

const iosGoogleMapsApiKey = process.env.IOS_GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: 'customer',
    slug: 'customer',
    version: '1.0.0',
    orientation: 'portrait',
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
        LSApplicationQueriesSchemes: ['tez', 'phonepe', 'paytmmp', 'bhim', 'credpay', 'whatsapp'],
        ITSAppUsesNonExemptEncryption: false,
      },
      // Undefined (key omitted from .env.local) is a valid, supported state
      // — Expo's own config schema just skips Google Maps setup on iOS
      // when this is absent, same as Android would if GOOGLE_MAPS_API_KEY
      // were unset.
      config: iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : undefined,
    },
    android: {
      package: 'com.gloceries.customer',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
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
      'expo-splash-screen',
      'expo-image',
      'expo-notifications',
      'expo-video',
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

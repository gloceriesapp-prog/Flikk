const { validateApiUrl } = require('../../packages/shared/config/api-url.cjs');
const buildProfile = process.env.EAS_BUILD_PROFILE;
const developmentApi = buildProfile ? buildProfile.startsWith('development') : process.env.NODE_ENV !== 'production' && process.env.APP_ENV !== 'production';
validateApiUrl(process.env.EXPO_PUBLIC_API_URL, developmentApi);

// Dynamic config (not app.json) so the Google Maps Android key comes from
// an env var, never hardcoded into a committed file — same reason
// apps/partner and apps/customer both use app.config.js instead of static
// app.json. Expo CLI auto-loads .env/.env.local into process.env before
// evaluating this file (no dotenv dependency needed) — see .env.example.
// iOS needs no key: react-native-maps uses Apple Maps there by default.
//
// react-native-maps needs a native dev build (`npx expo run:ios` / EAS dev
// client) to actually render — it isn't bundled in plain Expo Go as of SDK
// 52+ (same note apps/customer's own LocationSearchScreen.tsx carries).
// DeliveryMapScreen won't show a live map inside plain Expo Go.
//
// IOS_GOOGLE_MAPS_API_KEY is optional (same pattern as apps/customer); once
// it's set, a fresh native build switches iOS to real Google Maps + the same
// grayscale style Android uses. Until then iOS falls back to Apple Maps.

const iosGoogleMapsApiKey = process.env.IOS_GOOGLE_MAPS_API_KEY;

module.exports = {
  expo: {
    name: 'rider',
    slug: 'rider',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.gloceries.rider',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Gloceries uses your location to show your live position to the customer while delivering their order.',
        // Background ("Always") grant — lets presence keep pinging dispatch
        // when the app is backgrounded/killed mid-shift (backgroundLocation.ts).
        NSLocationAlwaysAndWhenInUseUsageDescription: 'Gloceries shares your location while you are online so you keep receiving delivery offers, even when the app is in the background.',
        UIBackgroundModes: ['location'],
        // Lets Linking.canOpenURL detect the Google Maps app so "Navigate"
        // can prefer it over Apple Maps; without this iOS silently reports it
        // as unavailable and we always fall back to Apple Maps.
        LSApplicationQueriesSchemes: ['comgooglemaps'],
      },
      // Undefined when the key is unset is a valid, supported state — Expo
      // just skips Google Maps setup on iOS then (Apple Maps fallback).
      config: iosGoogleMapsApiKey ? { googleMapsApiKey: iosGoogleMapsApiKey } : undefined,
    },
    android: {
      package: 'com.gloceries.rider',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'ACCESS_BACKGROUND_LOCATION', 'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_LOCATION'],
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
      'expo-secure-store',
      'expo-notifications',
      'expo-font',
      'expo-splash-screen',
      'expo-video',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Gloceries uses your location to show your live position to the customer while delivering their order.',
          // Background presence pings while online (backgroundLocation.ts) —
          // Android needs the foreground-service + background flags wired by
          // the plugin, not just the manifest permission above.
          locationAlwaysAndWhenInUsePermission: 'Gloceries shares your location while you are online so you keep receiving delivery offers, even when the app is in the background.',
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
    ],
    extra: {
      // A boolean, never the key itself — DeliveryMapView reads this (via
      // expo-constants) to decide whether iOS gets real Google Maps + the
      // same grayscale style Android already uses, or falls back to Apple
      // Maps. Flips automatically the next time this key is set + a fresh
      // native build ships — no code change needed there.
      hasIosGoogleMaps: Boolean(iosGoogleMapsApiKey),
    },
  },
};

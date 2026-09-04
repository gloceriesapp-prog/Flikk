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
      bundleIdentifier: 'com.flikk.rider',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Flikk uses your location to show your live position to the customer while delivering their order.',
      },
    },
    android: {
      package: 'com.flikk.rider',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
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
      'expo-secure-store',
      'expo-notifications',
      'expo-font',
      'expo-splash-screen',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Flikk uses your location to show your live position to the customer while delivering their order.',
        },
      ],
    ],
  },
};

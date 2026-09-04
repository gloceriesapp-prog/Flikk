// Dynamic config (not app.json) so the Google Maps Android key comes from
// an env var, never hardcoded into a file that gets committed. Expo CLI
// auto-loads .env/.env.local into process.env before evaluating this file
// (no dotenv dependency needed) — see .env.example for the var name. iOS
// needs no key at all: react-native-maps uses Apple Maps by default there.

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
      bundleIdentifier: 'com.flikk.customer',
      infoPlist: {
        NSLocationWhenInUseUsageDescription: 'Flikk uses your location to find stores near you and set your delivery address.',
        LSApplicationQueriesSchemes: ['tez', 'phonepe', 'paytmmp'],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.flikk.customer',
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
      '@react-native-community/datetimepicker',
      'expo-secure-store',
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Flikk uses your location to find stores near you and set your delivery address.',
        },
      ],
      'expo-font',
      'expo-splash-screen',
    ],
    extra: {
      eas: {
        projectId: 'a98e9f05-620b-4efb-8624-99d724667e7c',
      },
    },
    owner: 'nishal777',
  },
};

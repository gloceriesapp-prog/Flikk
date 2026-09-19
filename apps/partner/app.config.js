// Dynamic config (not app.json) so the Google Maps Android key comes from
// an env var, never hardcoded into a file that gets committed. Expo CLI
// auto-loads .env/.env.local into process.env before evaluating this file
// (no dotenv dependency needed) — see .env.example for the var name. iOS
// needs no key at all: react-native-maps uses Apple Maps by default there.

module.exports = {
  expo: {
    name: 'partner',
    slug: 'partner',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Gloceries uses your location to fill in your store's city automatically.",
        NSPhotoLibraryUsageDescription: 'Gloceries needs access to your photos to set your storefront picture.',
        NSCameraUsageDescription: 'Gloceries needs camera access to take a photo of your storefront.',
      },
    },
    android: {
      package: 'com.gloceries.partner',
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
      'expo-font',
      'expo-splash-screen',
      'expo-location',
      'expo-audio',
      'expo-secure-store',
      'expo-notifications',
      [
        'expo-image-picker',
        {
          photosPermission: 'Gloceries needs access to your photos to set your storefront picture.',
          cameraPermission: 'Gloceries needs camera access to take a photo of your storefront.',
        },
      ],
    ],
    // getExpoPushTokenAsync needs this once the app runs outside Expo Go's
    // managed flow — set via EAS_PROJECT_ID in .env (eas init'd project:
    // @nishal777/partner). Still no-ops gracefully if unset, per
    // registerPushToken.ts's own note — this isn't required to use the app.
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  },
};

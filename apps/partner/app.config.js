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
        NSLocationWhenInUseUsageDescription: "Flikk uses your location to fill in your store's city automatically.",
        NSPhotoLibraryUsageDescription: 'Flikk needs access to your photos to set your storefront picture.',
        NSCameraUsageDescription: 'Flikk needs camera access to take a photo of your storefront.',
      },
    },
    android: {
      package: 'com.flikk.partner',
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
          photosPermission: 'Flikk needs access to your photos to set your storefront picture.',
          cameraPermission: 'Flikk needs camera access to take a photo of your storefront.',
        },
      ],
    ],
    // getExpoPushTokenAsync needs this once the app runs outside Expo Go's
    // managed flow — empty/undefined until `eas init` links a real EAS
    // project (registerPushToken.ts's own note: every push-registration
    // path already no-ops gracefully without it, this isn't required to
    // use the app).
    extra: {
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  },
};

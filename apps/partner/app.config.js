/* global __dirname */
const { validateApiUrl } = require('../../packages/shared/config/api-url.cjs');
const { googleServicesFile: resolveGoogleServicesFile } = require('../../packages/shared/config/google-services.cjs');
const buildProfile = process.env.EAS_BUILD_PROFILE;
const developmentApi = buildProfile ? buildProfile.startsWith('development') : process.env.NODE_ENV !== 'production' && process.env.APP_ENV !== 'production';
validateApiUrl(process.env.EXPO_PUBLIC_API_URL, developmentApi);

// Dynamic config (not app.json) so the Google Maps Android key comes from
// an env var, never hardcoded into a file that gets committed. Expo CLI
// auto-loads .env/.env.local into process.env before evaluating this file
// (no dotenv dependency needed) — see .env.example for the var name. iOS
// needs no key at all: react-native-maps uses Apple Maps by default there.

// The EAS project id is not a secret — it ties builds, OTA updates and Expo
// push tokens to @nishal777/partner. Store builds must carry it: without it
// getExpoPushTokenAsync can't run, so a store owner would silently never get
// a "New order" push. A local dev run without it still starts (push no-ops).
const easProjectId = process.env.EAS_PROJECT_ID;
if (buildProfile && !buildProfile.startsWith('development') && !easProjectId) {
  throw new Error('EAS_PROJECT_ID must be set for preview/production builds (run `eas project:info` in apps/partner).');
}

// Sentry's build plugin uploads source maps; only wired when its org/project
// are configured, same as apps/customer.
const sentryPlugin = process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
  ? [['@sentry/react-native/expo', { organization: process.env.SENTRY_ORG, project: process.env.SENTRY_PROJECT }]]
  : [];

// Android push (FCM) config, shared by all three apps — see
// packages/shared/config/google-services.cjs.
const googleServicesFile = resolveGoogleServicesFile(__dirname, 'com.gloceries.partner');
if (buildProfile && !buildProfile.startsWith('development') && !googleServicesFile) {
  throw new Error('config/firebase/google-services.json is missing — Android push cannot work without it.');
}

module.exports = {
  expo: {
    // Home-screen and Play Store label. The slug stays 'partner' — it is the
    // EAS project's identity, and renaming it would unlink the project.
    name: 'Gloceries Partner',
    slug: 'partner',
    owner: 'nishal777',
    version: '1.0.0',
    // OTA updates only reach builds with the same runtime version, so a JS
    // update can never land on a binary missing the native code it needs.
    // Bump `version` whenever native modules change.
    runtimeVersion: { policy: 'appVersion' },
    updates: easProjectId ? { url: `https://u.expo.dev/${easProjectId}` } : undefined,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.gloceries.partner',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "Gloceries uses your location to fill in your store's city automatically.",
        NSPhotoLibraryUsageDescription: 'Gloceries needs access to your photos to set your storefront picture.',
        NSCameraUsageDescription: 'Gloceries needs camera access to take a photo of your storefront.',
      },
    },
    android: {
      package: 'com.gloceries.partner',
      googleServicesFile,
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
      ...sentryPlugin,
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
    extra: {
      eas: {
        projectId: easProjectId,
      },
    },
  },
};

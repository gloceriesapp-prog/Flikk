/* global __dirname */
const { validateApiUrl } = require('../../packages/shared/config/api-url.cjs');
const { googleServicesFile: resolveGoogleServicesFile } = require('../../packages/shared/config/google-services.cjs');
const { resolveNativeMapKeys } = require('../../packages/shared/config/google-maps.cjs');
const { androidGoogleMapsApiKey, iosGoogleMapsApiKey } = resolveNativeMapKeys(process.env);
const directAndroidRelease = process.env.PARTNER_DIRECT_ANDROID_RELEASE === 'true';
const directVersionCode = directAndroidRelease
  ? require('./scripts/release-config.cjs').productionVersionCode(process.env)
  : undefined;
if (directAndroidRelease && !androidGoogleMapsApiKey) {
  throw new Error('A direct production release requires a native Android Maps SDK key.');
}
const { validateMonitoringConfig } = require('./config-monitoring.cjs');
validateMonitoringConfig(process.env);
const buildProfile = process.env.EAS_BUILD_PROFILE;
const developmentApi = buildProfile ? buildProfile.startsWith('development') : process.env.NODE_ENV !== 'production' && process.env.APP_ENV !== 'production';
// eas-cli evaluates this file on the developer's machine *before* it pulls the
// EAS environment variables (it needs extra.eas.projectId first), so a release
// profile has no EXPO_PUBLIC_API_URL there yet. Enforce the HTTPS release URL
// on the EAS builder (EAS_BUILD=true), where the real bundle is produced. The
// local pre-read is skipped entirely: it may see a developer's LAN URL from
// .env.local, which never reaches the builder (it is not committed).
if (directAndroidRelease || developmentApi || process.env.EAS_BUILD === 'true') {
  validateApiUrl(process.env.EXPO_PUBLIC_API_URL, directAndroidRelease ? false : developmentApi);
}

// Dynamic config (not app.json) so the Google Maps Android key comes from
// an env var, never hardcoded into a file that gets committed. Expo CLI
// auto-loads .env/.env.local into process.env before evaluating this file
// (no dotenv dependency needed) — see .env.example for the var name. iOS
// uses Apple Maps by default; an optional iOS SDK key enables Google Maps.

// EAS project @nishal777/partner. Not a secret: it ties builds, OTA updates
// and Expo push tokens to this project, so it is fixed here rather than
// read from env — a build can never ship without it.
const easProjectId = 'f27829aa-b709-4d41-9186-8cde149ef0ac';

// Native crash integration is always generated; production requires the DSN
// and private upload credentials rather than silently shipping without them.
const sentryPlugin = [['@sentry/react-native/expo', {
  ...(process.env.SENTRY_ORG ? { organization: process.env.SENTRY_ORG } : {}),
  ...(process.env.SENTRY_PROJECT ? { project: process.env.SENTRY_PROJECT } : {}),
}]];

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
    version: '1.0.5',
    // OTA updates only reach builds with the same runtime version, so a JS
    // update can never land on a binary missing the native code it needs.
    // Bump `version` whenever native modules change.
    runtimeVersion: { policy: 'appVersion' },
    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
      ...(directAndroidRelease ? { requestHeaders: { 'expo-channel-name': 'production' } } : {}),
    },
    orientation: 'default',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.gloceries.partner',
      ...(iosGoogleMapsApiKey ? { config: { googleMapsApiKey: iosGoogleMapsApiKey } } : {}),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "Gloceries uses your location to fill in your store's city automatically.",
        NSPhotoLibraryUsageDescription: 'Gloceries needs access to your photos to set your storefront picture.',
        NSCameraUsageDescription: 'Gloceries needs camera access to take a photo of your storefront.',
      },
    },
    android: {
      package: 'com.gloceries.partner',
      ...(directAndroidRelease ? { versionCode: directVersionCode } : {}),
      googleServicesFile,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      // No ads: keep the advertising-ID permission a Google library may merge
      // in out of the manifest, matching the Play "Advertising ID: No" answer.
      // RECORD_AUDIO comes from expo-image-picker's video capture; the app
      // only takes photos, so it would be an unexplained microphone permission.
      blockedPermissions: ['com.google.android.gms.permission.AD_ID', 'android.permission.RECORD_AUDIO'],
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
      ...sentryPlugin,
      'expo-asset',
      'expo-font',
      'expo-splash-screen',
      'expo-location',
      // The order alert only plays in the foreground (playOrderAlertSound.ts:
      // shouldPlayInBackground false) and never records. The plugin's
      // defaults would add FOREGROUND_SERVICE(_MEDIA_PLAYBACK) and
      // RECORD_AUDIO, which Play then requires us to declare and justify.
      ['expo-audio', { enableBackgroundPlayback: false, recordAudioAndroid: false }],
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
      hasIosGoogleMaps: Boolean(iosGoogleMapsApiKey),
      eas: {
        projectId: easProjectId,
      },
    },
  },
};

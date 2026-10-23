// Read-only build gate: never prints credentials or deploys anything.
const { validateApiUrl } = require('../../../packages/shared/config/api-url.cjs');
const failures = [];
try { validateApiUrl(process.env.EXPO_PUBLIC_API_URL, false); } catch { failures.push('Configure an HTTPS release API URL.'); }
for (const name of ['EXPO_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN']) {
  if (!process.env[name]?.trim()) failures.push(`Missing ${name}.`);
}
for (const name of Object.keys(process.env)) {
  if (/^EXPO_PUBLIC_(RAZORPAY_(KEY_SECRET|WEBHOOK_SECRET)|.*SECRET)/.test(name)) failures.push(`${name} must not be a public (bundled) variable.`);
}
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  try { if (new URL(process.env.EXPO_PUBLIC_SENTRY_DSN).protocol !== 'https:') throw new Error(); }
  catch { failures.push('Sentry DSN must be an HTTPS URL.'); }
}
try {
  const { expo } = require('../app.config.js');
  const manifest = require('../package.json');
  if (manifest.version !== expo.version) failures.push('package.json and app.config.js versions must match.');
  if (expo.runtimeVersion?.policy !== 'appVersion') failures.push('Native releases require the appVersion update-runtime policy.');
  if (!expo.plugins?.includes('./plugins/withAndroidReleaseQuality.cjs')) failures.push('Android release optimization plugin is missing.');
  // iOS can deliberately use Apple Maps. Only Android needs the native key.
  if (process.env.EAS_BUILD_PLATFORM !== 'ios' && !expo.android?.config?.googleMaps?.apiKey) {
    failures.push('Missing ANDROID_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY).');
  }
  if (expo.name !== 'Gloceries') failures.push(`App name must be "Gloceries" (got "${expo.name}").`);
  if (expo.scheme !== 'gloceries') failures.push('App scheme must be "gloceries" (deep links/auth redirects depend on it).');
  if (!expo.extra?.eas?.projectId) failures.push('Missing extra.eas.projectId.');
} catch (error) { failures.push(`app.config.js failed to load: ${error.message}`); }
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Customer release configuration verified. Device and provider tests are still required.');

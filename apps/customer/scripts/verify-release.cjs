// Read-only build gate: never prints credentials or deploys anything.
const { validateApiUrl } = require('../../../packages/shared/config/api-url.cjs');
const failures = [];
try { validateApiUrl(process.env.EXPO_PUBLIC_API_URL, false); } catch { failures.push('Configure an HTTPS release API URL.'); }
for (const name of ['EXPO_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN', 'GOOGLE_MAPS_API_KEY']) {
  if (!process.env[name]?.trim()) failures.push(`Missing ${name}.`);
}
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  try { if (new URL(process.env.EXPO_PUBLIC_SENTRY_DSN).protocol !== 'https:') throw new Error(); }
  catch { failures.push('Sentry DSN must be an HTTPS URL.'); }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log('Customer release configuration verified. Device and provider tests are still required.');

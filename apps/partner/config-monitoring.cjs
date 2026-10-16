// Checked on the EAS builder, where secret environment variables are available.
// Local config reads and CI never need production credentials.
function validateMonitoringConfig(env) {
  const release = env.EAS_BUILD === 'true' && ['production', 'release-validation'].includes(env.EAS_BUILD_PROFILE);
  if (!release) return;
  const required = ['EXPO_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN'];
  const missing = required.filter(name => !env[name]?.trim());
  if (missing.length) throw new Error(`Release crash monitoring is not configured. Add ${missing.join(', ')} in EAS production.`);
  let dsn;
  try { dsn = new URL(env.EXPO_PUBLIC_SENTRY_DSN); } catch { throw new Error('EXPO_PUBLIC_SENTRY_DSN must be a valid HTTPS Sentry DSN.'); }
  if (dsn.protocol !== 'https:' || !dsn.username || !/\/\d+$/.test(dsn.pathname)) {
    throw new Error('EXPO_PUBLIC_SENTRY_DSN must be a valid HTTPS Sentry DSN.');
  }
}
module.exports = { validateMonitoringConfig };

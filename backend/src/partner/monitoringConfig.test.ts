import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const { validateMonitoringConfig } = createRequire(import.meta.url)('../../../apps/partner/config-monitoring.cjs');
const complete = { EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'production', EXPO_PUBLIC_SENTRY_DSN: 'https://public-key@example.ingest.sentry.io/123', SENTRY_ORG: 'example', SENTRY_PROJECT: 'partner', SENTRY_AUTH_TOKEN: 'private-test-token' };
describe('partner release monitoring configuration', () => {
  it('allows local config and CI without credentials', () => expect(() => validateMonitoringConfig({})).not.toThrow());
  it('accepts a fully configured release', () => expect(() => validateMonitoringConfig(complete)).not.toThrow());
  for (const name of ['EXPO_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT', 'SENTRY_AUTH_TOKEN']) {
    it(`rejects a release missing ${name} without leaking values`, () => {
      expect(() => validateMonitoringConfig({ ...complete, [name]: '' })).toThrow(name);
      try { validateMonitoringConfig({ ...complete, [name]: '' }); } catch (error) { expect(String(error)).not.toContain('private-test-token'); }
    });
  }
  it('requires monitoring on the internal release-validation build too', () => expect(() => validateMonitoringConfig({ EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'release-validation' })).toThrow('Release crash monitoring'));
  it('rejects insecure or malformed DSNs', () => {
    for (const dsn of ['invalid', 'http://key@example.com/123', 'https://example.com/123']) expect(() => validateMonitoringConfig({ ...complete, EXPO_PUBLIC_SENTRY_DSN: dsn })).toThrow('HTTPS Sentry DSN');
  });
});

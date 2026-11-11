import { updateIdentity, updateTags } from '../src/features/app-updates/updateIdentity';
import { sanitizeTelemetryEvent } from '../src/observability/sanitize';

it('attaches the exact running source/runtime/update to errors and transactions without identity data', () => {
  const identity = updateIdentity({ updateId: 'a0000000-0000-4000-8000-000000000001',
    runtimeVersion: '1.0.4-ios-native-2', channel: 'production', isEmbeddedLaunch: false }, 'b'.repeat(40));
  const event = sanitizeTelemetryEvent({ tags: updateTags(identity), user: { email: 'private@example.com' }, extra: { payment: 'private' } });
  expect(event.tags).toMatchObject({ app_source_commit: 'b'.repeat(40), expo_update_id: identity.updateId,
    expo_runtime: identity.runtimeVersion, expo_channel: 'production', expo_embedded: 'false' });
  expect(event.extra).toBeUndefined();
  expect(event.user).toEqual({ ip_address: '0.0.0.0' });
});
it('handles embedded/emergency and development launches and rejects arbitrary metadata', () => {
  const identity = updateIdentity({ updateId: 'private@example.com', runtimeVersion: 'Bearer secret', channel: 'private@example.com',
    isEmbeddedLaunch: true, isEmergencyLaunch: true }, 'private@example.com');
  expect(identity).toEqual({ sourceCommit: 'unknown', updateId: 'embedded-or-development', runtimeVersion: 'unknown',
    channel: 'unknown', embedded: true, emergency: true });
  expect(JSON.stringify(updateTags(identity))).not.toContain('private');
});

it('wires public update identity into Sentry initialization', () => {
  // Runtime imports observe the integration against the native Jest mocks.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sentry = require('@sentry/react-native');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../src/observability/crashReporting');
  expect(sentry.init).toHaveBeenCalledWith(expect.objectContaining({ initialScope: {
    tags: expect.objectContaining({ app_source_commit: expect.any(String), expo_update_id: expect.any(String),
      expo_runtime: expect.any(String), expo_embedded: expect.any(String) }),
  } }));
});

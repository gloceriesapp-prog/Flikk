import { readFileSync } from 'node:fs';
import path from 'node:path';
import { sanitizeTelemetryEvent } from '../src/observability/sanitize';

it('removes coordinates, request/account data and network payloads from transactions', () => {
  const event = {
    transaction: 'LocationSearch',
    user: { id: 'customer-private', email: 'private@example.com', ip_address: '192.0.2.42' },
    request: { url: 'https://api.gloceries.com/location/reverse-geocode?lat=13.223456&lng=74.744321' },
    extra: { address: 'Private house' }, breadcrumbs: [{ data: { latitude: 13.223456 } }],
    spans: [{ op: 'http.client', span_id: 'span', start_timestamp: 1, timestamp: 2,
      description: 'GET /location/reverse-geocode?lat=13.223456&lng=74.744321',
      data: { 'http.url': 'https://api.gloceries.com/location/reverse-geocode?lat=13.223456&lng=74.744321', address: 'Private house' } }],
    contexts: { trace: { trace_id: 'trace', data: { latitude: 13.223456 } }, device: { model: 'Test device' } },
  };
  const clean = sanitizeTelemetryEvent(event);
  const json = JSON.stringify(clean);
  for (const value of ['13.223456', '74.744321', 'Private house', 'customer-private', 'private@example.com', '192.0.2.42', 'reverse-geocode']) expect(json).not.toContain(value);
  expect(clean.user).toEqual({ ip_address: '0.0.0.0' });
  expect(clean.spans[0]).toMatchObject({ op: 'http.client', span_id: 'span', start_timestamp: 1, timestamp: 2 });
  expect(clean.contexts.trace).toEqual({ trace_id: 'trace' });
  expect(clean.transaction).toBe('LocationSearch');
});
it('uses the same filtering for crashes and scrubs identifying exception text', () => {
  const clean = sanitizeTelemetryEvent({ user: { id: 'private' }, message: 'Contact private@example.com', exception: { values: [{ value: 'Failed https://api.gloceries.com/location?lat=13.223456&lng=74.744321' }] } });
  expect(clean.message).toBe('Contact [email]');
  expect(clean.exception.values[0].value).not.toContain('13.223456');
  expect(clean.user).toEqual({ ip_address: '0.0.0.0' });
});

it('filters both SDK event paths rather than crash events alone', () => {
  const source = readFileSync(path.join(__dirname, '../src/observability/crashReporting.ts'), 'utf8');
  expect(source).toContain('beforeSend: sanitizeTelemetryEvent');
  expect(source).toContain('beforeSendTransaction: sanitizeTelemetryEvent');
  expect(source).toContain('maxBreadcrumbs: 0');
});

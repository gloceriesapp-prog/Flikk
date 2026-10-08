import { expect, it } from 'vitest';
import { notificationCursor } from './contracts.js';
import { notificationDisposition, orderNotificationTarget, customerNotificationTarget } from '../../../apps/customer/src/features/notifications/target';
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const target = { type: 'order' as const, customer_id: a, notification_id: b, order_id: a, is_trip: false };
it('waits through cold start and login, rejects another account and opens only when ready', () => {
    expect(notificationDisposition(target, null, false)).toBe('wait');
    expect(notificationDisposition(target, a, false)).toBe('wait');
    expect(notificationDisposition(target, b, true)).toBe('discard');
    expect(notificationDisposition(target, a, true)).toBe('open');
});
it('rejects arbitrary routes, malformed IDs and ambiguous trip flags', () => {
    expect(orderNotificationTarget(target)).toEqual(target);
    for (const bad of [null, { url: 'https://example.com' }, { ...target, order_id: '../admin' }, { ...target, is_trip: 'false' }, { ...target, customer_id: undefined }])
        expect(orderNotificationTarget(bad)).toBeNull();
});
it('validates bounded, typed keyset cursors before constructing a database filter', () => {
    const cursor = { id: a, created_at: '2026-10-04T00:00:00.000Z' };
    expect(notificationCursor(Buffer.from(JSON.stringify(cursor)).toString('base64url'))).toEqual(cursor);
    expect(notificationCursor(undefined)).toBeNull();
    for (const bad of ['', [], 'x'.repeat(301), Buffer.from(JSON.stringify({ ...cursor, id: 'a),customer_id.neq.any' })).toString('base64url'), Buffer.from(JSON.stringify({ ...cursor, created_at: 'oops' })).toString('base64url')])
        expect(() => notificationCursor(bad)).toThrow('Invalid notification cursor');
});

it('parses account-owned area alerts without accepting arbitrary destination routes', () => {
  const area = { type: 'area', customer_id: a, notification_id: b, route: 'Admin' };
  expect(customerNotificationTarget(area)).toEqual({ type: 'area', customer_id: a, notification_id: b });
  expect(customerNotificationTarget({ ...area, customer_id: 'invalid' })).toBeNull();
  expect(customerNotificationTarget({ ...area, notification_id: null })).toBeNull();
});

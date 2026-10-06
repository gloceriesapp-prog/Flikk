import { expect, it } from 'vitest';
import { trackingState } from '../../../apps/customer/src/screens/track-order/state/trackingState';
const base = { hasData: false, empty: false, pending: false, paused: false, error: null };
it('distinguishes initial loading from a failed request', () => {
    expect(trackingState({ ...base, pending: true })).toBe('loading');
    expect(trackingState({ ...base, error: { status: 503 } })).toBe('request-error');
    expect(trackingState({ ...base, error: { status: 0, code: 'NETWORK_ERROR' } })).toBe('connection-error');
});
it('retains previously loaded data during transient failures', () => {
    expect(trackingState({ ...base, hasData: true, error: { status: 503 } })).toBe('stale');
    expect(trackingState({ ...base, hasData: true, paused: true })).toBe('stale');
});
it('does not display inaccessible stale orders or crash on an empty trip', () => {
    expect(trackingState({ ...base, hasData: true, error: { status: 404 } })).toBe('unavailable');
    expect(trackingState({ ...base, hasData: true, error: { status: 403 } })).toBe('unavailable');
    expect(trackingState({ ...base, hasData: true, empty: true })).toBe('unavailable');
});
it('offers a connection retry for a paused initial request', () => expect(trackingState({ ...base, pending: true, paused: true })).toBe('connection-error'));

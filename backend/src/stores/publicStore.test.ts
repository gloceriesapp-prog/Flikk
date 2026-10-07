import { expect, it } from 'vitest';
import { publicStore } from './publicStore.js';
it('exposes storefront fields without leaking new merchant or payment fields', () => {
    expect(publicStore({ id: 'store', name: 'Shop', payout_bank_account_number: 'secret', pan_number: 'secret', owner_user_id: 'owner', new_secret_column: 'secret' })).toEqual({ id: 'store', name: 'Shop' });
});
it('includes created_at so Home "new" and "top rated" sorts never read undefined', () => {
    expect(publicStore({ id: 'store', created_at: '2026-01-01T00:00:00Z', owner_user_id: 'owner' })).toEqual({ id: 'store', created_at: '2026-01-01T00:00:00Z' });
});

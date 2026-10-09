import { expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ filters: [] as unknown[][] }));
vi.mock('../db/supabase.js', () => ({ supabase: { from: () => {
  const builder = { select: () => builder, eq: (key: string, value: unknown) => { db.filters.push([key,value]); return builder; }, limit: async () => ({ data: [{ users: { expo_push_token: 'ExponentPushToken[manager]' } },{ users: { expo_push_token: 'ExponentPushToken[owner]' } }], error: null }) }; return builder;
} } }));
import { storePushRecipients } from './pushRecipients.js';
it('deduplicates devices and limits fanout to active approved store accounts', async () => {
  expect(await storePushRecipients('shop', 'ExponentPushToken[owner]')).toEqual(['ExponentPushToken[owner]','ExponentPushToken[manager]']);
  expect(db.filters).toEqual([['store_id','shop'],['is_active',true],['users.is_approved',true],['users.role','store_owner']]);
});

// `npx tsx src/store/orderHistory.selfcheck.ts` from apps/rider.
import assert from 'node:assert';
import { mergeHistory } from './orderHistory';

type O = { id: string; deliveredAt?: string; payout?: number };
const local: O[] = [{ id: 'a', deliveredAt: '2026-10-14T10:00:00Z', payout: 30 }, { id: 'fresh', deliveredAt: '2026-10-15T09:00:00Z' }];
const server: O[] = [{ id: 'a', deliveredAt: '2026-10-14T10:00:00Z', payout: 35 }, { id: 'b', deliveredAt: '2026-10-13T08:00:00Z' }];

const merged = mergeHistory(local, server, 10);
assert.deepEqual(merged.map((o) => o.id), ['fresh', 'a', 'b'], 'newest first, local-only kept, server rows added');
assert.equal(merged.find((o) => o.id === 'a')?.payout, 35, 'server version wins');
assert.equal(mergeHistory(local, server, 2).length, 2, 'capped');
assert.deepEqual(mergeHistory([], [], 5), []);
assert.deepEqual(mergeHistory<O>([{ id: 'x' }], [{ id: 'y' }], 5).map((o) => o.id), ['x', 'y'], 'missing dates sort last, stable by id');

console.log('orderHistory selfcheck: ok');

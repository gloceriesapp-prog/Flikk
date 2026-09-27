// ponytail: one runnable self-check for createNotification's argument→row-shape
// mapping — the camelCase input → snake_case column names, the 'general' type
// default, and orderId omitted → null. Injects a fake insert client that
// captures the row, so it never touches a real DB.
// Run: npx tsx backend/src/lib/notifications.selfcheck.ts
import assert from 'node:assert';
import { createNotification } from './notifications.js';

let captured: Record<string, unknown> | null = null;
const fakeDb = {
  from(table: string) {
    assert.equal(table, 'notifications');
    return {
      async insert(row: Record<string, unknown>) {
        captured = row;
        return { error: null };
      },
    };
  },
};

// Full input → every column mapped, type passed through.
await createNotification(
  { userId: 'u1', title: 'Pickup confirmed', body: 'Head to the store.', type: 'assignment', orderId: 'o1' },
  fakeDb,
);
assert.deepEqual(captured, {
  user_id: 'u1',
  title: 'Pickup confirmed',
  body: 'Head to the store.',
  type: 'assignment',
  order_id: 'o1',
});

// type omitted → 'general', orderId omitted → null.
await createNotification({ userId: 'u2', title: 'Hi', body: 'There' }, fakeDb);
assert.deepEqual(captured, { user_id: 'u2', title: 'Hi', body: 'There', type: 'general', order_id: null });

// Never throws: an insert error is swallowed, not propagated.
await createNotification(
  { userId: 'u3', title: 'x', body: 'y' },
  { from: () => ({ insert: async () => ({ error: new Error('boom') }) }) },
);

console.log('notifications.selfcheck OK');

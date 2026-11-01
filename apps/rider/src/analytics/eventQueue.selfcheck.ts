// `npx tsx src/analytics/eventQueue.selfcheck.ts` from apps/rider. Fails loudly
// if batching, the memory bound or the network-retry order regresses.

import assert from 'node:assert';
import { createEventQueue, type QueuedEvent } from './eventQueue';

const ev = (i: number): QueuedEvent => ({ name: 'screen_viewed', at: `t${i}`, props: { i } });

// Batches come out oldest-first, capped at the batch size.
{
  const q = createEventQueue(10);
  for (let i = 0; i < 7; i++) q.push(ev(i));
  assert.deepEqual(q.take(5).map((e) => e.at), ['t0', 't1', 't2', 't3', 't4']);
  assert.equal(q.size, 2);
}

// Over the bound, the oldest events are dropped.
{
  const q = createEventQueue(3);
  for (let i = 0; i < 5; i++) q.push(ev(i));
  assert.deepEqual(q.take().map((e) => e.at), ['t2', 't3', 't4']);
}

// A failed batch goes back in front of newer events, still bounded.
{
  const q = createEventQueue(4);
  q.push(ev(0)); q.push(ev(1));
  const batch = q.take(2);
  q.push(ev(2)); q.push(ev(3)); q.push(ev(4));
  q.putBack(batch);
  assert.deepEqual(q.take().map((e) => e.at), ['t1', 't2', 't3', 't4']);
}

console.log('eventQueue self-check ok');

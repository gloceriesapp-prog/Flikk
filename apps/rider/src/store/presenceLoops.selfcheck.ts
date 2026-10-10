// Runnable self-check for the presence/assignment loop decision — the pure
// core of the background/battery fix (#2). No framework:
// `npx tsx src/store/presenceLoops.selfcheck.ts` from apps/rider. Fails loudly
// (assert) if the dedupe/pause rule regresses.

import assert from 'node:assert';
import { loopPlan, normalizeAppState, shouldRunForegroundLoops } from './presenceLoops';

// foreground + online → foreground loops ON, background task SUPPRESSED.
{
  const p = loopPlan('active', true);
  assert.equal(p.assignmentPoll, true, 'fg+online: 12s poll runs');
  assert.equal(p.presencePing, true, 'fg+online: 45s foreground ping runs');
  assert.equal(p.backgroundWriter, false, 'fg+online: bg task suppressed → no double PATCH');
  assert.equal(shouldRunForegroundLoops('active', true), true);
}

// background + online → foreground loops OFF, background task WRITES.
{
  const p = loopPlan('background', true);
  assert.equal(p.assignmentPoll, false, 'bg+online: 12s poll paused');
  assert.equal(p.presencePing, false, 'bg+online: foreground ping paused');
  assert.equal(p.backgroundWriter, true, 'bg+online: bg task is the sole presence writer');
  assert.equal(shouldRunForegroundLoops('background', true), false);
}

// offline → foreground presence ping stopped in either phase, no bg writer.
{
  const fg = loopPlan('active', false);
  assert.equal(fg.presencePing, false, 'offline: no foreground presence ping');
  assert.equal(fg.backgroundWriter, false, 'offline: no bg presence writer');
  const bg = loopPlan('background', false);
  assert.equal(bg.assignmentPoll, false, 'offline+bg: nothing runs');
  assert.equal(bg.presencePing, false);
  assert.equal(bg.backgroundWriter, false);
}

// 'inactive'/unknown normalize to background (iOS transient states).
assert.equal(normalizeAppState('inactive'), 'background');
assert.equal(normalizeAppState('unknown'), 'background');
assert.equal(normalizeAppState('active'), 'active');

console.log('presenceLoops.selfcheck: all cases OK');

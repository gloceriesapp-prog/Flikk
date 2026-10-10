// Runnable self-check for the WelcomeScreen gating helper. No framework:
// `npx tsx src/navigation/welcomeGate.selfcheck.ts` from apps/customer.
// Fails loudly (assert) if the gate regresses to the old fixed-timer behaviour.

import assert from 'node:assert';
import { computeWelcomeVisible } from './welcomeGate';

const MIN = 700;

// Hidden ONLY once hydrated AND past the min floor.
assert.equal(
  computeWelcomeVisible({ hydrated: true, elapsedMs: 701, minMs: MIN }),
  false,
  'hydrated + past min must hide the welcome screen',
);
assert.equal(
  computeWelcomeVisible({ hydrated: true, elapsedMs: MIN, minMs: MIN }),
  false,
  'hydrated + exactly at min must hide (>= floor)',
);

// Still shown if hydrated but under the min floor (avoids a one-frame flash).
assert.equal(
  computeWelcomeVisible({ hydrated: true, elapsedMs: 300, minMs: MIN }),
  true,
  'hydrated but under min must still show the welcome screen',
);

// Still shown if past the min floor but not yet hydrated (slow device).
assert.equal(
  computeWelcomeVisible({ hydrated: false, elapsedMs: 5000, minMs: MIN }),
  true,
  'past min but not hydrated must still show the welcome screen',
);

// Degenerate: nothing ready at t0.
assert.equal(
  computeWelcomeVisible({ hydrated: false, elapsedMs: 0, minMs: MIN }),
  true,
  'cold start shows the welcome screen',
);

console.log('welcomeGate selfcheck ok');

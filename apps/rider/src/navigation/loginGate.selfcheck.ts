// Self-check for loginGate: a signed-in session without a known status never
// lands on the onboarding wizard just because GET /auth/me failed or was slow.
// Run: npx tsx apps/rider/src/navigation/loginGate.selfcheck.ts
import assert from 'node:assert';
import { loginGate } from './loginGate';

const base = { hasKnownStatus: false, statusLoaded: false, statusFailed: false, statusSlow: false };
assert.strictEqual(loginGate(base), 'checking');
assert.strictEqual(loginGate({ ...base, statusLoaded: true }), 'route');
assert.strictEqual(loginGate({ ...base, hasKnownStatus: true }), 'route');
assert.strictEqual(loginGate({ ...base, statusFailed: true }), 'retry');
assert.strictEqual(loginGate({ ...base, statusSlow: true }), 'retry');
// A later success wins over an earlier slow/failed flag.
assert.strictEqual(loginGate({ ...base, statusSlow: true, statusLoaded: true }), 'route');

console.log('login gate: ok');

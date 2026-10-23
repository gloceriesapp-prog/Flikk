// Self-check for latestRefreshToken: after the background task rotated the
// session, the stored token (not the spent one in memory) is redeemed.
// Run: npx tsx apps/rider/src/api/refreshToken.selfcheck.ts
import assert from 'node:assert';
import { latestRefreshToken } from './refreshToken';

assert.strictEqual(latestRefreshToken('rotated-by-background', 'spent-in-memory'), 'rotated-by-background');
assert.strictEqual(latestRefreshToken('same', 'same'), 'same');
assert.strictEqual(latestRefreshToken(null, 'in-memory'), 'in-memory');
assert.strictEqual(latestRefreshToken('', 'in-memory'), 'in-memory');
assert.strictEqual(latestRefreshToken(null, null), null);

console.log('refresh token: ok');

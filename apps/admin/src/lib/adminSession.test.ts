import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdminSessionCookie, isValidAdminSessionCookie } from './adminSession';

process.env.ADMIN_2FA_SECRET = 'x'.repeat(40);

test('a freshly signed cookie is valid until it expires', async () => {
  const value = await createAdminSessionCookie();
  assert.equal(await isValidAdminSessionCookie(value), true);
  // 8h + a minute later it is expired.
  assert.equal(await isValidAdminSessionCookie(value, Date.now() + (8 * 3600 + 60) * 1000), false);
  assert.equal(await isValidAdminSessionCookie(undefined), false);
  assert.equal(await isValidAdminSessionCookie(''), false);
});

test('tampered, re-prefixed or forged cookies are rejected', async () => {
  const value = await createAdminSessionCookie();
  const [prefix, iat, exp, sig] = value.split('.');
  // Extend the expiry without re-signing → signature no longer matches.
  assert.equal(await isValidAdminSessionCookie(`${prefix}.${iat}.${Number(exp) + 99999}.${sig}`), false);
  // Garbage signature.
  assert.equal(await isValidAdminSessionCookie(`${prefix}.${iat}.${exp}.AAAA`), false);
  // Wrong prefix (not an admin token).
  assert.equal(await isValidAdminSessionCookie(`user.${iat}.${exp}.${sig}`), false);
  // Wrong shape.
  assert.equal(await isValidAdminSessionCookie(`${prefix}.${exp}.${sig}`), false);
  // Signed under a different secret → rejected.
  process.env.ADMIN_2FA_SECRET = 'y'.repeat(40);
  assert.equal(await isValidAdminSessionCookie(value), false);
  // A too-short secret fails closed (never validates).
  process.env.ADMIN_2FA_SECRET = 'short';
  assert.equal(await isValidAdminSessionCookie(value), false);
  process.env.ADMIN_2FA_SECRET = 'x'.repeat(40);
});

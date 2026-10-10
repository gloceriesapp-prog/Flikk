const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isEncryptionConfigured, encryptDocument, decryptDocument } = require('./encryption.cjs');

const env = { DOC_ENCRYPTION_KEY: require('node:crypto').randomBytes(32).toString('base64') };
const otherEnv = { DOC_ENCRYPTION_KEY: require('node:crypto').randomBytes(32).toString('base64') };
const plaintext = Buffer.from('Aadhaar: 1234 5678 9012 — sensitive KYC bytes');

test('round-trip encrypt -> decrypt returns the original bytes', () => {
  const doc = encryptDocument(plaintext, env);
  assert.ok(Buffer.isBuffer(doc.ciphertext));
  assert.notEqual(doc.ciphertext.toString('base64'), plaintext.toString('base64'));
  for (const field of ['encIv', 'encTag', 'wrappedDek', 'wrapIv', 'wrapTag', 'kekId', 'algo'])
    assert.equal(typeof doc[field], 'string');
  assert.equal(doc.algo, 'AES-256-GCM');
  assert.equal(doc.kekId, 'v1');
  assert.deepEqual(decryptDocument(doc, env), plaintext);
});

test('decrypt with a different KEK throws (wrong key)', () => {
  const doc = encryptDocument(plaintext, env);
  assert.throws(() => decryptDocument(doc, otherEnv));
});

test('flipping one ciphertext byte throws (tamper)', () => {
  const doc = encryptDocument(plaintext, env);
  doc.ciphertext[0] ^= 0x01;
  assert.throws(() => decryptDocument(doc, env));
});

test('flipping one auth-tag byte throws (tamper)', () => {
  const doc = encryptDocument(plaintext, env);
  const tag = Buffer.from(doc.encTag, 'base64');
  tag[0] ^= 0x01;
  doc.encTag = tag.toString('base64');
  assert.throws(() => decryptDocument(doc, env));
});

test('isEncryptionConfigured is false when key is absent or wrong length', () => {
  assert.equal(isEncryptionConfigured(env), true);
  assert.equal(isEncryptionConfigured({}), false);
  assert.equal(isEncryptionConfigured({ DOC_ENCRYPTION_KEY: '' }), false);
  assert.equal(isEncryptionConfigured({ DOC_ENCRYPTION_KEY: Buffer.alloc(16).toString('base64') }), false);
  assert.throws(() => encryptDocument(plaintext, {}), /32 bytes/);
});

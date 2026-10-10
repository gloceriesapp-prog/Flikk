'use strict';
// App-layer envelope encryption for sensitive KYC documents (Phase 1).
// AES-256-GCM throughout, node:crypto only, no dependencies.
//
// Envelope model: a fresh random 32-byte DEK encrypts each document; the DEK
// is itself wrapped by a long-lived 32-byte KEK (DOC_ENCRYPTION_KEY, base64,
// held only in backend/admin env). Ciphertext is uploaded as raw bytes; the
// small envelope metadata (IVs, auth tags, wrapped DEK) persist as base64 text.
//
// Single KEK in Phase 1 (kekId defaults 'v1'). To rotate later, map record.kekId
// to a historical key inside loadKek instead of always reading DOC_ENCRYPTION_KEY.
const { createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');
const ALGO = 'AES-256-GCM';
const CIPHER = 'aes-256-gcm';

function decodeKey(env) {
  const raw = env && env.DOC_ENCRYPTION_KEY;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  const key = Buffer.from(raw, 'base64');
  return key.length === 32 ? key : null;
}

function isEncryptionConfigured(env) {
  return decodeKey(env) !== null;
}

function loadKek(env) {
  const key = decodeKey(env);
  if (!key) throw new Error('DOC_ENCRYPTION_KEY must be a base64 string decoding to exactly 32 bytes.');
  return { kekId: (env && env.DOC_ENCRYPTION_KEK_ID) || 'v1', key };
}

function gcmEncrypt(key, plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(CIPHER, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return { iv, ciphertext, tag: cipher.getAuthTag() };
}

function gcmDecrypt(key, iv, ciphertext, tag) {
  const decipher = createDecipheriv(CIPHER, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function encryptDocument(plaintextBuf, env) {
  if (!Buffer.isBuffer(plaintextBuf)) throw new Error('encryptDocument requires a Buffer plaintext.');
  const { kekId, key } = loadKek(env);
  const dek = randomBytes(32);
  try {
    const enc = gcmEncrypt(dek, plaintextBuf);
    const wrap = gcmEncrypt(key, dek);
    return {
      ciphertext: enc.ciphertext,
      encIv: enc.iv.toString('base64'),
      encTag: enc.tag.toString('base64'),
      wrappedDek: wrap.ciphertext.toString('base64'),
      wrapIv: wrap.iv.toString('base64'),
      wrapTag: wrap.tag.toString('base64'),
      kekId,
      algo: ALGO,
    };
  } finally {
    dek.fill(0);
  }
}

function decryptDocument(record, env) {
  const { key } = loadKek(env);
  // Unwrap the DEK (throws on tamper/wrong KEK), then decrypt the ciphertext.
  const dek = gcmDecrypt(key, Buffer.from(record.wrapIv, 'base64'), Buffer.from(record.wrappedDek, 'base64'), Buffer.from(record.wrapTag, 'base64'));
  try {
    return gcmDecrypt(dek, Buffer.from(record.encIv, 'base64'), record.ciphertext, Buffer.from(record.encTag, 'base64'));
  } finally {
    dek.fill(0);
  }
}

module.exports = { isEncryptionConfigured, loadKek, encryptDocument, decryptDocument };

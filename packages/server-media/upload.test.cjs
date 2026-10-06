const { test } = require('node:test');
const assert = require('node:assert/strict');
const { uploadPublicImage } = require('./upload.cjs');
const { publicFolder, r2Config } = require('./policy.cjs');
const bytes = Buffer.from('RIFF0000WEBPtest');
const config = { bucket: 'gloceries-public', publicBaseUrl: 'https://images.example.com' };
function fixture(fail = '') {
  const events = []; let row;
  return { events, get row() { return row; }, dependencies: {
    config,
    db: { from: () => ({ insert: async value => { events.push('intent'); row = value; return { error: fail === 'insert' ? {} : null }; },
      update: value => ({ eq: async () => { events.push(value.status); return { error: fail === 'ready' && value.status === 'ready' ? {} : null }; } }) }) },
    put: async key => { events.push('put'); assert.match(key, /^products\/[a-f0-9-]+\.webp$/); if (fail === 'put' || fail === 'remove') throw Error('secret provider error'); },
    verifyDelivery: async () => { events.push('verify'); if (fail === 'delivery') throw new (require('./policy.cjs').MediaError)('MEDIA_DELIVERY_UNAVAILABLE', 'Public domain unavailable'); },
    remove: async () => { events.push('remove'); if (fail === 'remove') throw Error('delete failed'); },
  } };
}
test('public folders route legacy inputs and reject private buckets', () => {
  assert.equal(publicFolder('product-images'), 'products');
  for (const value of ['rider-documents', 'store-documents', '../products', 'toString']) assert.throws(() => publicFolder(value));
});
test('S3 endpoint cannot be used as image delivery URL', () => {
  const env = { R2_ACCOUNT_ID: 'f06edcade7a6bfb879b47eec02d5bf69', R2_BUCKET_NAME: 'gloceries-public', R2_ACCESS_KEY_ID: 'fixture', R2_SECRET_ACCESS_KEY: 'fixture', R2_PUBLIC_BASE_URL: 'https://images.example.com' };
  assert.equal(r2Config(env).publicBaseUrl, 'https://images.example.com');
  assert.throws(() => r2Config({ ...env, R2_PUBLIC_BASE_URL: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` }));
  assert.throws(() => r2Config({ ...env, R2_SECRET_ACCESS_KEY: '' }));
  assert.throws(() => r2Config({ ...env, R2_PUBLIC_BASE_URL: 'images.example.com' }), /must start with https/);
});
test('public upload persists durable intent before writing and returns ready reference', async () => {
  const f = fixture(); const result = await uploadPublicImage(f.dependencies, { folder: 'products', bytes });
  assert.deepEqual(f.events, ['intent', 'put', 'verify', 'ready']);
  assert.equal(result.url, `${config.publicBaseUrl}/${result.objectKey}`);
  assert.equal(f.row.sha256.length, 64);
  const second = await uploadPublicImage(f.dependencies, { folder: 'products', bytes });
  assert.notEqual(result.objectKey, second.objectKey);
});
test('metadata failure never uploads an untracked object', async () => {
  const f = fixture('insert'); await assert.rejects(uploadPublicImage(f.dependencies, { folder: 'products', bytes }), /temporarily unavailable/);
  assert.deepEqual(f.events, ['intent']);
});
for (const failure of ['put', 'ready', 'remove']) test(`${failure} failure compensates and retains durable recovery intent`, async () => {
  const f = fixture(failure); await assert.rejects(uploadPublicImage(f.dependencies, { folder: 'products', bytes }), /Please retry/);
  assert.ok(f.events.includes('remove')); assert.equal(f.events.at(-1), 'failed');
});
test('non-image input fails before database writes', async () => {
  const f = fixture(); await assert.rejects(uploadPublicImage(f.dependencies, { folder: 'products', bytes: Buffer.from('bad') }));
  assert.deepEqual(f.events, []);
});

test('unreachable public delivery is never returned or marked ready', async () => {
  const f = fixture('delivery');
  await assert.rejects(uploadPublicImage(f.dependencies, { folder: 'products', bytes }), error => error.code === 'MEDIA_DELIVERY_UNAVAILABLE');
  assert.deepEqual(f.events, ['intent', 'put', 'verify', 'remove', 'failed']);
});
const { verifyPublicImage } = require('./delivery.cjs');
test('public verification requires a successful image response', async () => {
  await verifyPublicImage('https://images.example.com/a.webp', async () => new Response(null, { status: 200, headers: { 'content-type': 'image/webp' } }));
  for (const status of [403,404,503]) await assert.rejects(verifyPublicImage('https://images.example.com/a.webp', async () => new Response(null, { status })), error => error.code === 'MEDIA_DELIVERY_UNAVAILABLE');
  await assert.rejects(verifyPublicImage('https://images.example.com/a.webp', async () => new Response(null, { status: 200, headers: { 'content-type': 'text/html' } })), /not publicly accessible/);
  await assert.rejects(verifyPublicImage('https://images.example.com/a.webp', async () => { throw Error('DNS failed'); }), /domain is unreachable/);
});

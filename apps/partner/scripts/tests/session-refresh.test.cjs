/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, shared, fetch) {
  const module = { exports: {} };
  const context = { module, exports: module.exports, require: () => shared,
    fetch, AbortController, setTimeout, clearTimeout };
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, context, { filename: file });
  return module.exports;
}

test('refresh keeps sessions on transient failures and expires only rejected credentials', async () => {
  const sharedFile = path.resolve(__dirname, '../../../../packages/shared/src/auth/client.ts');
  const refreshFile = path.resolve(__dirname, '../../src/api/refreshSession.ts');
  let refreshResponse;
  const fetch = async (url, options) => {
    if (!url.endsWith('/auth/refresh')) return { status: 401, ok: false, json: async () => ({}) };
    return refreshResponse(options);
  };
  const shared = load(sharedFile, null, fetch);
  const { requestSessionRefresh } = load(refreshFile, shared, fetch);
  let expired = 0;
  const client = shared.createApiClient({ baseUrl: 'https://api.example.com',
    getAccessToken: () => 'expired-access',
    refresh: async () => (await requestSessionRefresh('https://api.example.com', 'saved-refresh', 10))?.access_token ?? null,
    onSessionExpired: () => { expired++; },
  });
  for (const status of [429, 500, 503]) {
    refreshResponse = async () => ({ status, ok: false });
    await assert.rejects(client.apiRequest('/orders'), error => error.code === 'REFRESH_UNAVAILABLE');
    assert.equal(expired, 0);
  }
  refreshResponse = async () => { throw new TypeError('offline'); };
  await assert.rejects(client.apiRequest('/orders'), error => error.code === 'NETWORK_ERROR');
  assert.equal(expired, 0);
  refreshResponse = ({ signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  await assert.rejects(client.apiRequest('/orders'), error => error.code === 'REQUEST_TIMEOUT');
  assert.equal(expired, 0);
  refreshResponse = async () => ({ ok: true, status: 200, json: async () => ({ access_token: '' }) });
  await assert.rejects(client.apiRequest('/orders'), error => error.code === 'INVALID_RESPONSE');
  assert.equal(expired, 0);
  refreshResponse = async () => ({ ok: true, status: 200, json: async () => ({ access_token: 'new', refresh_token: 'rotated' }) });
  const tokens = await requestSessionRefresh('https://api.example.com', 'old');
  assert.equal(tokens.access_token, 'new');
  assert.equal(tokens.refresh_token, 'rotated');
  refreshResponse = async () => ({ ok: false, status: 401 });
  await assert.rejects(client.apiRequest('/orders'), error => error.status === 401);
  assert.equal(expired, 1);
});

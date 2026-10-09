const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual API/store modules with deterministic I/O. No SMS is sent.
function load(relativePath, dependencies) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return exports;
}

test('login and onboarding propagate offline failures instead of issuing dummy success', async () => {
  const offline = new Error('offline');
  const calls = [];
  const apiRequest = async (...args) => { calls.push(args); throw offline; };
  const shared = { createAuthApi: () => ({
    requestOtp: phone => apiRequest('/auth/otp/request', { body: { phone } }),
    verifyOtp: (phone, code) => apiRequest('/auth/otp/verify', { body: { phone, code } }),
    checkAccountStatus: () => apiRequest('/auth/me'),
  }) };
  const api = load('src/api/auth.ts', { '@gloceries/shared': shared, './client': { apiRequest } });
  for (const operation of [
    () => api.requestOtp('+919876543210'),
    () => api.verifyOtp('+919876543210', '123456'),
    () => api.checkAccountStatus(),
    () => api.submitStoreApplication({ storeName: 'Test store' }),
    () => api.uploadStorePhoto('image-data', 'image/png'),
  ]) await assert.rejects(operation, error => error === offline);
  assert.deepEqual(calls.map(([route]) => route), [
    '/auth/otp/request', '/auth/otp/verify', '/auth/me',
    '/partner/store-application', '/partner/store-photo',
  ]);
});

function authStore(saved) {
  const values = new Map(Object.entries(saved));
  const secureStore = {
    getItemAsync: async key => values.get(key) ?? null,
    deleteItemAsync: async key => { values.delete(key); },
  };
  const zustand = { create: initialize => {
    let state;
    state = initialize(patch => { state = { ...state, ...patch }; });
    return { getState: () => state };
  } };
  const { useAuthStore } = load('src/store/useAuthStore.ts', {
    'expo-secure-store': secureStore, zustand,
  });
  return { store: useAuthStore, values };
}

test('cold start removes either legacy demo token before attempting network access', async () => {
  for (const pair of [['dev:+919876543210', 'refresh'], ['access', 'dev:+919876543210']]) {
    const { store, values } = authStore({
      gloceries_partner_access_token: pair[0], gloceries_partner_refresh_token: pair[1],
    });
    await store.getState().hydrate();
    assert.equal(store.getState().accessToken, null);
    assert.equal(store.getState().refreshToken, null);
    assert.equal(store.getState().isHydrated, true);
    assert.equal(values.size, 0);
  }
});

test('cold start preserves real sessions without manufacturing approval', async () => {
  const { store, values } = authStore({
    gloceries_partner_access_token: 'real-access', gloceries_partner_refresh_token: 'real-refresh',
  });
  await store.getState().hydrate();
  assert.equal(store.getState().accessToken, 'real-access');
  assert.equal(store.getState().refreshToken, 'real-refresh');
  assert.equal(store.getState().isApproved, false);
  assert.equal(store.getState().hasStore, false);
  assert.equal(values.size, 2);
});

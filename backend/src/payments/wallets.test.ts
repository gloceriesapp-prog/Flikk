import { expect, it } from 'vitest';
import { parseAvailableWallets } from './wallets.js';
it('offers only the two requested wallets when explicitly enabled by Razorpay', () => {
  expect(parseAvailableWallets({ wallet: { mobikwik: true, olamoney: true, payzapp: true } }))
    .toEqual([{ code: 'mobikwik', name: 'MobiKwik' }, { code: 'olamoney', name: 'Ola Money' }]);
  expect(parseAvailableWallets({ wallet: { mobikwik: 'true', olamoney: false } })).toEqual([]);
});
it('does not invent wallet options when unavailable or malformed', () => {
  for (const methods of [{}, { wallet: false }, { wallet: {} }]) expect(parseAvailableWallets(methods)).toEqual([]);
  for (const wallet of [true, 'enabled', []]) expect(() => parseAvailableWallets({ wallet })).toThrow();
});

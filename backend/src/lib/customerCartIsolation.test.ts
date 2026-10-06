import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ values: new Map<string, string>(), read: null as null | (() => Promise<string | null>) }));
vi.mock('../../../apps/customer/node_modules/@react-native-async-storage/async-storage/lib/commonjs/index.js', () => ({ default: {
 getItem: async (key: string) => fixture.read ? fixture.read() : fixture.values.get(key) ?? null,
 setItem: async (key: string, value: string) => { fixture.values.set(key, value); },
 removeItem: async (key: string) => { fixture.values.delete(key); },
} }));
vi.mock('../../../apps/customer/node_modules/expo-secure-store/build/SecureStore.js', () => ({ getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {} }));
import { useCartStore } from '../../../apps/customer/src/store/useCartStore';
import { useAuthStore } from '../../../apps/customer/src/store/useAuthStore';
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const item = { id: 'product', productId: 'product', storeId: 'shop', name: 'Rice', weight: '1 kg', price: 10, quantity: 1 };
function saved(ownerId: string, version = 2) { return JSON.stringify({ version, state: { ownerId, items: [item] } }); }
beforeEach(async () => {
 fixture.read = null; fixture.values.clear();
 useCartStore.getState().clear();
 useAuthStore.setState({ customerId: a, sessionEpoch: useAuthStore.getState().sessionEpoch + 1 });
 await useCartStore.persist.clearStorage();
});
it('restores a returning customer’s own draft', async () => {
 fixture.read = async () => saved(a);
 await useCartStore.persist.rehydrate();
 expect(useCartStore.getState().items).toHaveLength(1);
});
it('discards a different account’s draft and unowned legacy drafts', async () => {
 for (const value of [saved(b), saved(a, 1)]) {
  fixture.read = async () => value;
  await useCartStore.persist.rehydrate();
  expect(useCartStore.getState().items).toEqual([]);
 }
});
it('discards an A hydration response arriving after switching to B', async () => {
 let release!: (value: string) => void;
 let started!: () => void;
 const reading = new Promise<void>(resolve => { started = resolve; });
 fixture.read = () => { started(); return new Promise(resolve => { release = resolve; }); };
 const hydration = useCartStore.persist.rehydrate();
 await reading;
 useCartStore.getState().clear();
 useAuthStore.setState({ customerId: b, sessionEpoch: useAuthStore.getState().sessionEpoch + 1 });
 release(saved(a));
 await hydration;
 expect(useCartStore.getState().items).toEqual([]);
});

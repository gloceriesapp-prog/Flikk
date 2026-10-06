import { beforeEach, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ values: new Map<string, string>(), read: null as null | ((key: string) => Promise<string | null>), api: vi.fn() }));
vi.mock('../../../apps/customer/node_modules/@react-native-async-storage/async-storage/lib/commonjs/index.js', () => ({ default: {
 getItem: async (key: string) => fixture.read ? fixture.read(key) : fixture.values.get(key) ?? null,
 setItem: async (key: string, value: string) => { fixture.values.set(key, value); }, removeItem: async (key: string) => { fixture.values.delete(key); },
} }));
vi.mock('../../../apps/customer/node_modules/expo-secure-store/build/SecureStore.js', () => ({ getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {} }));
vi.mock('../../../apps/customer/src/api/client', () => ({ apiRequest: fixture.api }));
import { useAuthStore } from '../../../apps/customer/src/store/useAuthStore';
import { readAttempt, saveAttempt, clearAttempt, clearCommittedAttempt, type SavedAttempt } from '../../../apps/customer/src/features/checkout-recovery/attemptStorage';
import { cartPurchaseSignature } from '../../../apps/customer/src/store/cartIdentity';
const a = '00000000-0000-4000-8000-000000000001'; const b = '00000000-0000-4000-8000-000000000002';
const key = (owner: string) => `flikk.checkout-attempt.v1.${owner}`;
const attempt = (id: string): SavedAttempt => ({ id, kind: 'order', cartKey: 'cart', input: { attempt_id: id, address_id: 'address', store_id: 'shop', items: [] } });
beforeEach(() => { fixture.values.clear(); fixture.read = null; fixture.api.mockReset(); useAuthStore.setState({ customerId: a, sessionEpoch: useAuthStore.getState().sessionEpoch + 1 }); });
it('reads the same saved attempt after a lost order response', async () => {
 await saveAttempt(attempt('first')); fixture.api.mockRejectedValue(new Error('offline'));
 await expect(clearCommittedAttempt({ orderId: 'order' })).rejects.toThrow('offline');
 expect((await readAttempt())?.id).toBe('first');
});
it('serializes clears with newer saves so the newer attempt survives', async () => {
 await saveAttempt(attempt('first'));
 let release!: (raw: string) => void; let started!: () => void;
 const reading = new Promise<void>(r => { started = r; });
 fixture.read = () => { started(); return new Promise(r => { release = r; }); };
 const clearing = clearAttempt('first'); await reading;
 const saving = saveAttempt(attempt('second')); fixture.read = null; release(JSON.stringify(attempt('first')));
 await clearing; await saving; expect((await readAttempt())?.id).toBe('second');
});
it('never clears a different checkout after a delayed payment success', async () => {
 await saveAttempt(attempt('second')); fixture.api.mockResolvedValue({ result: { id: 'other-order' } });
 await clearCommittedAttempt({ orderId: 'first-order' }); expect((await readAttempt())?.id).toBe('second');
 fixture.api.mockResolvedValue({ result: { id: 'other-order' } }); await clearCommittedAttempt({ orderId: 'other-order' }); expect(await readAttempt()).toBeNull();
});
it('rejects stale account reads while preserving account B’s pending attempt', async () => {
 let release!: (raw: string) => void; let started!: () => void;
 const reading = new Promise<void>(r => { started = r; }); fixture.read = () => { started(); return new Promise(r => { release = r; }); };
 const pending = readAttempt(); const check = expect(pending).rejects.toThrow('Session changed'); await reading;
 useAuthStore.setState({ customerId: b, sessionEpoch: useAuthStore.getState().sessionEpoch + 1 }); fixture.values.set(key(b), JSON.stringify(attempt('b-attempt'))); fixture.read = null;
 release(JSON.stringify(attempt('a-attempt'))); await check; expect((await readAttempt())?.id).toBe('b-attempt');
});
it('does not silently replace corrupt or inconsistent saved attempts', async () => {
 fixture.values.set(key(a), JSON.stringify({ ...attempt('first'), input: { attempt_id: 'different' } }));
 await expect(readAttempt()).rejects.toThrow('needs review'); expect(fixture.values.has(key(a))).toBe(true);
});
it('retains an edited cart but accepts confirmed price changes for the same purchase', () => {
 const item = { id: 'p::v', quantity: 1, price: 10 };
 expect(cartPurchaseSignature([item])).toBe(cartPurchaseSignature([{ ...item, price: 12 }]));
 expect(cartPurchaseSignature([item])).not.toBe(cartPurchaseSignature([{ ...item, quantity: 2 }]));
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import type { CreateOrderInput } from '../../api/orders';
import type { CreateTripInput } from '../../api/trips';
import type { PaymentTarget } from '../../api/payments';
export interface SavedAttempt { id: string; kind: 'order' | 'trip'; input: CreateOrderInput | CreateTripInput; cartKey: string }
function storageKey() {
  const customerId = useAuthStore.getState().customerId;
  if (!customerId) throw new Error('Sign in to continue checkout.');
  return `flikk.checkout-attempt.v1.${customerId}`;
}
let storageOperations: Promise<unknown> = Promise.resolve();
function attemptStorageOperation<T>(action: (key: string) => Promise<T>): Promise<T> {
  const key = storageKey();
  const epoch = useAuthStore.getState().sessionEpoch;
  const work = storageOperations.catch(() => {}).then(async () => {
    if (useAuthStore.getState().sessionEpoch !== epoch) throw new Error('Session changed.');
    const result = await action(key);
    if (useAuthStore.getState().sessionEpoch !== epoch) throw new Error('Session changed.');
    return result;
  });
  storageOperations = work;
  return work;
}
function parseAttempt(raw: string): SavedAttempt {
  const saved = JSON.parse(raw) as SavedAttempt;
  if (!saved.id || !saved.input || !saved.cartKey || !['order', 'trip'].includes(saved.kind)
    || saved.input.attempt_id !== saved.id) throw new Error('Your saved checkout needs review. Contact support before ordering again.');
  return saved;
}
export function readAttempt(): Promise<SavedAttempt | null> {
  return attemptStorageOperation(async key => {
    const raw = await AsyncStorage.getItem(key);
    return raw ? parseAttempt(raw) : null;
  });
}
export function saveAttempt(attempt: SavedAttempt): Promise<void> {
  parseAttempt(JSON.stringify(attempt));
  return attemptStorageOperation(key => AsyncStorage.setItem(key, JSON.stringify(attempt)));
}
export function clearAttempt(id?: string): Promise<void> {
  // Serialize read/check/delete with saves so a late clear cannot remove a
  // newer attempt on the same account. Keys remain customer-specific.
  return attemptStorageOperation(async key => {
    const raw = await AsyncStorage.getItem(key);
    if (!raw || (id && parseAttempt(raw).id !== id)) return;
    await AsyncStorage.removeItem(key);
  });
}
export async function newAttemptId(): Promise<string> { return (await apiRequest<{ id: string }>('/checkout/attempt-id', { method: 'POST' })).id; }
export async function findAttempt(id: string): Promise<{ kind: 'order' | 'trip'; result: { id: string } | null; abandoned: boolean } | null> {
  return apiRequest(`/checkout/attempts/${id}`);
}
export function attemptTarget(attempt: { kind: 'order' | 'trip'; result: { id: string } }): PaymentTarget {
  return attempt.kind === 'trip' ? { tripId: attempt.result.id } : { orderId: attempt.result.id };
}

export function closeSavedAttempt(saved: SavedAttempt): Promise<{ kind: 'order' | 'trip'; result: { id: string } | null }> {
 return apiRequest(`/checkout/attempts/${saved.id}/close`, { method: 'POST', body: { kind: saved.kind, input: saved.input } });
}

export async function clearCommittedAttempt(target: PaymentTarget): Promise<void> {
  const epoch = useAuthStore.getState().sessionEpoch;
  const saved = await readAttempt();
  if (!saved) return;
  const committed = await findAttempt(saved.id);
  if (useAuthStore.getState().sessionEpoch !== epoch) throw new Error('Session changed.');
  const targetId = 'tripId' in target ? target.tripId : target.orderId;
  if (committed?.result?.id === targetId) await clearAttempt(saved.id);
}

import { createHash } from 'node:crypto';
import { supabase } from '../db/supabase.js';
import { AppError } from './errors.js';
import { parseCheckoutItems } from './checkoutItems.js';

export function checkoutAttemptIdentity(body: Record<string, unknown>, kind: 'order' | 'trip') {
  const id = body.attempt_id;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    throw new AppError(400, 'ATTEMPT_REQUIRED', 'A valid checkout attempt ID is required. Update the app before ordering.');
  // Price/quote expiry are deliberately excluded: replay returns the committed
  // snapshot even after stock, prices or the signed quote have changed.
  const quantities = new Map<string, number>();
  for (const item of parseCheckoutItems(body.items)) {
    const key = `${item.product_id}:${item.variant_id ?? ''}`;
    quantities.set(key, (quantities.get(key) ?? 0) + item.quantity);
  }
  const fingerprint = createHash('sha256').update(JSON.stringify({ kind,
    address: body.address_id, store: kind === 'order' ? body.store_id : null,
    method: body.payment_method ?? 'cod', promo: body.promo_code ?? null,
    items: [...quantities.entries()].sort(([a], [b]) => a.localeCompare(b)),
  })).digest('hex');
  return { id, fingerprint };
}
export async function findCheckoutAttempt(customerId: string, id: string, fingerprint?: string) {
  const { data, error } = await supabase.from('checkout_attempts').select('fingerprint, kind, result, abandoned')
    .eq('customer_id', customerId).eq('attempt_id', id).maybeSingle();
  if (error) throw new AppError(503, 'CHECKOUT_RECOVERY_UNAVAILABLE', 'Checkout recovery is unavailable. Please try again shortly.');
  if (data && fingerprint && data.fingerprint !== fingerprint)
    throw new AppError(409, 'ATTEMPT_CONFLICT', 'This checkout attempt belongs to a different cart. Review your existing order.');
  if (data?.abandoned && fingerprint) throw new AppError(409, 'ATTEMPT_CLOSED', 'This checkout attempt was closed. Review your cart.');
  return data;
}
export async function commitCheckoutAttempt(customerId: string, identity: { id: string; fingerprint: string }, kind: 'order' | 'trip', args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('create_checkout_attempt', {
    p_customer_id: customerId, p_attempt_id: identity.id, p_fingerprint: identity.fingerprint, p_kind: kind, p_args: args,
  });
  if (error?.code === 'P0410') throw new AppError(409, 'ATTEMPT_CLOSED', 'This checkout attempt was closed. Review your cart.');
  if (error?.code === 'P0409') throw new AppError(409, 'ATTEMPT_CONFLICT', 'This checkout attempt belongs to a different cart.');
  return { data: data as { result: Record<string, unknown> & { id: string }; replayed: boolean } | null, error };
}

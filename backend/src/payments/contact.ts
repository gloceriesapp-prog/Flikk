import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

export function normalizePaymentEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /^login\+.*@gloceries\.com$/i.test(email)) return null;
  return email;
}

// Phone sign-in uses an internal synthetic Auth email. It is never a customer
// receipt destination. Store the real receipt email separately from identity.
export async function readPaymentEmail(customerId: string): Promise<string | null> {
  const { data, error } = await supabase.from('customer_payment_contacts').select('email').eq('user_id', customerId).maybeSingle();
  if (error) throw new AppError(503, 'PAYMENT_CONTACT_UNAVAILABLE', 'Could not load your payment contact.');
  const stored = normalizePaymentEmail(data?.email);
  if (stored) return stored;
  const { data: auth, error: authError } = await supabase.auth.admin.getUserById(customerId);
  if (authError) throw new AppError(503, 'PAYMENT_CONTACT_UNAVAILABLE', 'Could not load your payment contact.');
  return normalizePaymentEmail(auth.user?.email);
}
export async function getPaymentContact(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const email = await readPaymentEmail(req.user!.id);
    res.setHeader('Cache-Control', 'no-store'); res.json({ email, required: true });
  } catch (error) { next(error); }
}
export async function savePaymentContact(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const email = normalizePaymentEmail(req.body?.email);
    if (!email || Object.keys(req.body ?? {}).some(key => key !== 'email'))
      throw new AppError(400, 'INVALID_PAYMENT_EMAIL', 'Enter your real email address for the payment receipt.');
    const { error } = await supabase.from('customer_payment_contacts').upsert({ user_id: req.user!.id, email }, { onConflict: 'user_id' });
    if (error) throw new AppError(503, 'PAYMENT_CONTACT_UNAVAILABLE', 'Could not save your payment contact.');
    res.setHeader('Cache-Control', 'no-store'); res.json({ email, required: true });
  } catch (error) { next(error); }
}

import type { NextFunction, Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';

const METHODS = new Set(['cod', 'online', 'card', 'upi_app:gpay', 'upi_app:phonepe', 'upi_app:paytm', 'upi_app:bhim', 'upi_app:cred', 'upi_app:whatsapp']);
const METADATA_KEY = 'customer_checkout_payment_method';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePaymentPreference(method: unknown): string | null {
  // A verified VPA is deliberately not stored; it must be verified each visit.
  if (method === 'upi_id') return 'online';
  return typeof method === 'string' && METHODS.has(method) ? method : null;
}

export async function getPaymentPreference(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { data, error } = await supabase.auth.admin.getUserById(req.user!.id);
    if (error) throw new AppError(503, 'PAYMENT_PREFERENCE_UNAVAILABLE', 'Could not load your payment preference.');
    const method = normalizePaymentPreference(data.user?.user_metadata?.[METADATA_KEY]);
    if (method) return res.json({ method });
    // Existing customers without metadata still get their last real payment
    // type. Unpaid online attempts and cancelled orders cannot set a default.
    const { data: orders, error: orderError } = await supabase.from('orders')
      .select('payment_method').eq('customer_id', req.user!.id)
      .not('status', 'in', '(cancelled,failed)')
      .or('payment_method.eq.cod,razorpay_payment_id.not.is.null')
      .order('placed_at', { ascending: false }).limit(1);
    if (orderError) throw new AppError(503, 'PAYMENT_PREFERENCE_UNAVAILABLE', 'Could not load your payment preference.');
    res.json({ method: normalizePaymentPreference(orders?.[0]?.payment_method) });
  } catch (error) { next(error); }
}

export async function savePaymentPreference(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = req.body as { method?: unknown; orderId?: unknown; tripId?: unknown };
    const method = normalizePaymentPreference(body.method);
    const id = body.orderId ?? body.tripId;
    if (!method || typeof id !== 'string' || !UUID.test(id) || Boolean(body.orderId) === Boolean(body.tripId)) {
      throw new AppError(400, 'INVALID_PAYMENT_PREFERENCE', 'Choose a supported payment method and one order.');
    }
    const isTrip = Boolean(body.tripId);
    const { data: record, error } = await supabase.from(isTrip ? 'trips' : 'orders')
      .select(isTrip ? 'id, razorpay_payment_id, status' : 'id, razorpay_payment_id, status, payment_method')
      .eq('id', id).eq('customer_id', req.user!.id).maybeSingle();
    if (error) throw new AppError(503, 'PAYMENT_PREFERENCE_UNAVAILABLE', 'Could not save your payment preference.');
    if (!record) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    const row = record as unknown as { payment_method?: string; razorpay_payment_id: string | null; status: string };
    let orderMethod: string | undefined;
    if (isTrip) {
      const { data: leg, error: legError } = await supabase.from('orders').select('payment_method')
        .eq('trip_id', id).eq('customer_id', req.user!.id).limit(1).maybeSingle();
      if (legError) throw new AppError(503, 'PAYMENT_PREFERENCE_UNAVAILABLE', 'Could not save your payment preference.');
      orderMethod = leg?.payment_method;
    } else {
      orderMethod = row.payment_method;
    }
    if (['cancelled', 'failed'].includes(row.status) ||
        (method === 'cod' ? orderMethod !== 'cod' : orderMethod !== 'online' || !row.razorpay_payment_id)) {
      throw new AppError(409, 'PAYMENT_NOT_CONFIRMED', 'Only a confirmed order can update your payment preference.');
    }
    // Supabase merges user_metadata keys. This is a display preference only:
    // never a source of payment authority, bank details, VPA or credentials.
    const { error: updateError } = await supabase.auth.admin.updateUserById(req.user!.id, {
      user_metadata: { [METADATA_KEY]: method },
    });
    if (updateError) throw new AppError(503, 'PAYMENT_PREFERENCE_UNAVAILABLE', 'Could not save your payment preference.');
    res.json({ method });
  } catch (error) { next(error); }
}

// Explicit profile selection changes a display default only, never payment state.
export async function selectPaymentPreference(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const method = normalizePaymentPreference(req.body?.method);
    if (!method || Object.keys(req.body).some(key => key !== 'method')) {
      throw new AppError(400, 'INVALID_PAYMENT_PREFERENCE', 'Choose a supported payment method.');
    }
    const { error } = await supabase.auth.admin.updateUserById(req.user!.id, {
      user_metadata: { [METADATA_KEY]: method },
    });
    if (error) throw new AppError(503, 'PAYMENT_PREFERENCE_UNAVAILABLE', 'Could not save your payment preference.');
    res.json({ method });
  } catch (error) { next(error); }
}

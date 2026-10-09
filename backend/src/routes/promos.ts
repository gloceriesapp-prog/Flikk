// POST /promos/validate — CartScreen/CheckoutScreen's "Apply" button. Only
// ever tells the customer what a code is worth; the actual discount used
// at checkout is always recomputed server-side inside POST /orders and
// POST /trips (lookupPromoForCheckout below, exported for exactly that
// reuse) rather than trusted from this call's own response — same
// never-trust-the-client-for-money-math rule every other pricing path in
// this codebase follows.

import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { AppError } from '../lib/errors.js';
import { requireAuth, requireRole, type AuthedRequest } from '../middleware/auth.js';
import { validatePromoCode, type PromoCodeRow } from '../lib/promos.js';

export const promosRouter = Router();

// Shared by routes/orders.ts and routes/trips.ts — looks the code up,
// checks this customer hasn't already redeemed it, and returns the real
// discount amount for this cart. Throws AppError (400, PROMO_*) on any
// invalid/inapplicable code, same shape POST /promos/validate itself
// returns, so a checkout-time failure and a pre-checkout validate failure
// read identically to the client.
export async function lookupPromoForCheckout(
  code: string,
  customerId: string,
  itemTotal: number,
): Promise<{ promoCodeId: string; discountAmount: number }> {
  const { data: promo, error: promoErr } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .maybeSingle();
  if (promoErr) throw promoErr;
  if (!promo) throw new AppError(400, 'PROMO_NOT_FOUND', "This code doesn't exist.");

  const { count: redemptionCount, error: redemptionErr } = await supabase
    .from('promo_redemptions')
    .select('id', { count: 'exact', head: true })
    .eq('promo_code_id', promo.id)
    .eq('customer_id', customerId);
  if (redemptionErr) throw redemptionErr;

  try {
    const discountAmount = validatePromoCode(promo as PromoCodeRow, itemTotal, redemptionCount ?? 0);
    return { promoCodeId: promo.id, discountAmount };
  } catch (err) {
    if (err instanceof Error && 'code' in err) {
      throw new AppError(400, (err as { code: string }).code, err.message);
    }
    throw err;
  }
}

interface ValidateBody {
  code: string;
  item_total: number;
}

promosRouter.post('/validate', requireAuth, requireRole('customer'), async (req: AuthedRequest, res, next) => {
  try {
    const { code, item_total } = (req.body ?? {}) as ValidateBody;
    if (typeof code !== 'string' || !code.trim() || code.length > 100 || typeof item_total !== 'number' || !Number.isFinite(item_total) || item_total < 0) {
      throw new AppError(400, 'INVALID_REQUEST', 'code and item_total are required.');
    }
    const { discountAmount } = await lookupPromoForCheckout(code, req.user!.id, item_total);
    res.json({ valid: true, discount_amount: discountAmount });
  } catch (err) {
    next(err);
  }
});

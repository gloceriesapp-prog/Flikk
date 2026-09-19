// POST /payments/verify-upi-id — real verification for the customer-facing
// "Pay via UPI ID" row (apps/customer's PaymentMethodList.tsx). NPCI
// retired UPI Collect 28 Feb 2026 (verifyPayoutAccount.ts's own note), so
// there is no way left, on any provider, to type a VPA and have a payment
// request land inside that app automatically — that mechanism is gone
// industry-wide, not a gap in this code. What this endpoint actually does
// is confirm the typed VPA is a REAL, resolvable UPI ID before the
// customer is asked to go complete payment themselves (same
// pollOrderPaid.ts / PaymentProcessingScreen path an app-grid tap already
// uses) — reusing the exact real RazorpayX Fund Account Validation flow
// (Contact -> Fund Account -> a real ~₹1 penny-drop -> poll) already built
// for partner payout verification, rather than a second, fake "looks like
// an email so it's probably fine" regex check that would let a wrong or
// abandoned VPA through silently.
import type { Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { supabase } from '../db/supabase.js';
import { verifyPayoutAccount } from './verifyPayoutAccount.js';

interface VerifyUpiIdBody {
  vpa?: string;
}

// Same shape every real UPI app enforces (handle@bank-handle) — rejected
// here before ever spending a real ₹1 penny-drop call on something that
// obviously isn't a VPA at all.
const VPA_FORMAT = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,64}$/;

export async function verifyUpiId(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { vpa } = req.body as VerifyUpiIdBody;
    if (!vpa || !VPA_FORMAT.test(vpa)) {
      throw new AppError(400, 'INVALID_VPA_FORMAT', 'That doesn’t look like a real UPI ID (expected something like name@bank).');
    }

    const { data: customer } = await supabase.from('users').select('name, phone').eq('id', req.user!.id).single();

    const { result } = await verifyPayoutAccount({ method: 'upi', vpa }, customer?.name ?? 'Flikk customer', customer?.phone ?? null, null);

    res.json({
      valid: true,
      accountHolderName: result.registeredName,
    });
  } catch (err) {
    next(err);
  }
}

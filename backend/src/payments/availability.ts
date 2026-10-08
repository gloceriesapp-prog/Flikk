// Which payment methods a new checkout may use. Admin switches them in the
// admin "Checkout settings" page (platform_settings, migration 117); the env
// is the hard kill on top: online payment also needs Cashfree keys
// (paymentsConfigured) and ONLINE_PAYMENTS_DISABLED unset, COD needs
// COD_DISABLED unset. Verify/webhook/refunds are not gated here: a payment
// already started must still settle when online checkout is switched off.
import type { NextFunction, Request, Response } from 'express';
import { env, paymentsConfigured } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { getCheckoutControls, type CheckoutControls } from '../lib/platformSettings.js';

export interface PaymentAvailability {
  cod: boolean;
  online: boolean;
  minOrderValue: number;
}

export function resolvePaymentAvailability(
  controls: CheckoutControls,
  kill: { codDisabled: boolean; onlinePaymentsDisabled: boolean; paymentsConfigured: boolean },
): PaymentAvailability {
  return {
    cod: controls.codEnabled && !kill.codDisabled,
    online: controls.onlinePaymentsEnabled && kill.paymentsConfigured && !kill.onlinePaymentsDisabled,
    minOrderValue: controls.minOrderValue,
  };
}

export async function getPaymentAvailability(): Promise<PaymentAvailability> {
  return resolvePaymentAvailability(await getCheckoutControls(), {
    codDisabled: env.codDisabled,
    onlinePaymentsDisabled: env.onlinePaymentsDisabled,
    paymentsConfigured,
  });
}

export function paymentMethodUnavailable(method: 'cod' | 'online'): AppError {
  return method === 'cod'
    ? new AppError(409, 'COD_UNAVAILABLE', 'Cash on delivery is not available right now. Choose online payment.')
    : new AppError(409, 'ONLINE_PAYMENT_UNAVAILABLE', 'Online payment is not available right now. Choose cash on delivery.');
}

export async function assertPaymentMethodAvailable(method: 'cod' | 'online'): Promise<void> {
  const availability = await getPaymentAvailability();
  if (!availability[method]) throw paymentMethodUnavailable(method);
}

// Route guard for starting a new online payment (create-order, UPI intent /
// collect). Runs after requirePaymentsConfigured.
export function requireOnlinePaymentsOpen(_req: Request, _res: Response, next: NextFunction) {
  assertPaymentMethodAvailable('online').then(() => next(), next);
}

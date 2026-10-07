import { getPaymentRecovery, getPendingPayments } from './recovery.js';
// Everything payment-related lives in this folder — Cashfree client, each
// endpoint's logic in its own file; this router just wires routes. Mounted
// at /payments in index.ts (which also owns the raw-body capture webhook.ts
// needs for signature verification).
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createOrder } from './createOrder.js';
import { createUpiCollect, createUpiIntent, upiValidateBudget, validateUpiId } from './upi.js';
import { verifyPayment } from './verifyPayment.js';
import { paymentsConfigured, requirePaymentsConfigured } from './cashfreeClient.js';
import { handleWebhook } from './webhook.js';
import { abandonCheckout } from './abandonCheckout.js';
import { getPaymentPreference, savePaymentPreference, selectPaymentPreference } from './preference.js';

export const paymentsRouter = Router();

// Public: guests choose a payment method before signing in. COD-only until
// Cashfree keys are configured (config/env.ts); the app hides online methods.
paymentsRouter.get('/availability', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.json({ online: paymentsConfigured });
});
paymentsRouter.get('/pending', requireAuth, requireRole('customer'), getPendingPayments);
paymentsRouter.post('/recovery', requireAuth, requireRole('customer'), getPaymentRecovery);
// Not behind requirePaymentsConfigured: cancel/COD must work even if keys are pulled.
paymentsRouter.post('/abandon', requireAuth, requireRole('customer'), abandonCheckout);

paymentsRouter.patch('/preferred-method', requireAuth, requireRole('customer'), selectPaymentPreference);
paymentsRouter.get('/preference', requireAuth, requireRole('customer'), getPaymentPreference);
paymentsRouter.patch('/preference', requireAuth, requireRole('customer'), savePaymentPreference);

paymentsRouter.post('/create-order', requireAuth, requireRole('customer'), requirePaymentsConfigured, createOrder);
paymentsRouter.post('/upi/intent', requireAuth, requireRole('customer'), requirePaymentsConfigured, createUpiIntent);
paymentsRouter.post('/upi/collect', requireAuth, requireRole('customer'), requirePaymentsConfigured, createUpiCollect);
// Format check works without PG keys; name lookup needs verification creds.
paymentsRouter.post('/upi/validate', requireAuth, requireRole('customer'), upiValidateBudget, validateUpiId);
paymentsRouter.post('/verify', requireAuth, requireRole('customer'), requirePaymentsConfigured, verifyPayment);
paymentsRouter.post('/webhook', handleWebhook);

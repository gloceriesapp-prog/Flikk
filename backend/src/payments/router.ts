import { getPaymentRecovery, getPendingPayments } from './recovery.js';
// Everything payment-related lives in this folder — Razorpay client, each
// endpoint's logic in its own file; this router just wires routes. Mounted
// at /payments in index.ts (which also owns the raw-body capture webhook.ts
// needs for signature verification).
import { Router } from 'express';
import { getAvailableWallets } from './wallets.js';
import { getNetbankingBanks } from './netbankingBanks.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createOrder } from './createOrder.js';
import { createUpiIntent } from './upiIntent.js';
import { env } from '../config/env.js';
import { getPaymentContact, savePaymentContact } from './contact.js';
import { verifyPayment } from './verifyPayment.js';
import { requirePaymentsConfigured } from './razorpayClient.js';
import { getPaymentAvailability, requireOnlinePaymentsOpen } from './availability.js';
import { handleWebhook } from './webhook.js';
import { abandonCheckout } from './abandonCheckout.js';
import { getPaymentPreference, savePaymentPreference, selectPaymentPreference } from './preference.js';

export const paymentsRouter = Router();

// Public: guests choose a payment method before signing in. Online needs the
// admin switch, Razorpay keys and no env kill; COD needs the admin switch and
// no env kill (availability.ts). The app hides what is off and shows the
// platform minimum order value in the cart.
paymentsRouter.get('/availability', async (_req, res, next) => {
  try {
    const availability = await getPaymentAvailability();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ online: availability.online, cod: availability.cod, min_order_value: availability.minOrderValue,
      upi_intent: availability.online && env.razorpayEnv === 'live',
      upi_email_optional: env.razorpayUpiEmailOptional && env.razorpayEnv === 'live' });
  } catch (error) { next(error); }
});
paymentsRouter.get('/wallets', requirePaymentsConfigured, requireOnlinePaymentsOpen, async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ wallets: await getAvailableWallets() });
  } catch (error) { next(error); }
});
paymentsRouter.get('/netbanking-banks', requirePaymentsConfigured, requireOnlinePaymentsOpen, async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ banks: await getNetbankingBanks() });
  } catch (error) { next(error); }
});
paymentsRouter.get('/pending', requireAuth, requireRole('customer'), getPendingPayments);
paymentsRouter.post('/recovery', requireAuth, requireRole('customer'), getPaymentRecovery);
// Not behind requirePaymentsConfigured: cancel/COD must work even if keys are pulled.
paymentsRouter.post('/abandon', requireAuth, requireRole('customer'), abandonCheckout);

paymentsRouter.patch('/preferred-method', requireAuth, requireRole('customer'), selectPaymentPreference);
paymentsRouter.get('/preference', requireAuth, requireRole('customer'), getPaymentPreference);
paymentsRouter.patch('/preference', requireAuth, requireRole('customer'), savePaymentPreference);
paymentsRouter.get('/contact', requireAuth, requireRole('customer'), getPaymentContact);
paymentsRouter.patch('/contact', requireAuth, requireRole('customer'), savePaymentContact);

paymentsRouter.post('/create-order', requireAuth, requireRole('customer'), requirePaymentsConfigured, requireOnlinePaymentsOpen, createOrder);
paymentsRouter.post('/upi-intent', requireAuth, requireRole('customer'), requirePaymentsConfigured, requireOnlinePaymentsOpen, createUpiIntent);
// Format check works without PG keys; name lookup needs verification creds.
paymentsRouter.post('/verify', requireAuth, requireRole('customer'), requirePaymentsConfigured, verifyPayment);
paymentsRouter.post('/webhook', handleWebhook);

import { getPaymentRecovery, getPendingPayments } from './recovery.js';
// Everything payment-related lives in this folder — Razorpay client,
// each endpoint's real logic in its own file, this router just wires
// them to routes. Mounted at /payments in index.ts (which also owns the
// raw-body capture webhook.ts needs — see that file's own import site).
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createOrder } from './createOrder.js';
import { createUpiIntent } from './createUpiIntent.js';
import { verifyPayment } from './verifyPayment.js';
import { verifyUpiId } from './verifyUpiId.js';
import { handleWebhook } from './webhook.js';
import { getPaymentPreference, savePaymentPreference, selectPaymentPreference } from './preference.js';

export const paymentsRouter = Router();

paymentsRouter.get('/pending', requireAuth, requireRole('customer'), getPendingPayments);
paymentsRouter.post('/recovery', requireAuth, requireRole('customer'), getPaymentRecovery);

paymentsRouter.patch('/preferred-method', requireAuth, requireRole('customer'), selectPaymentPreference);
paymentsRouter.get('/preference', requireAuth, requireRole('customer'), getPaymentPreference);
paymentsRouter.patch('/preference', requireAuth, requireRole('customer'), savePaymentPreference);

paymentsRouter.post('/create-order', requireAuth, requireRole('customer'), createOrder);
paymentsRouter.post('/create-upi-intent', requireAuth, requireRole('customer'), createUpiIntent);
paymentsRouter.post('/verify-upi-id', requireAuth, requireRole('customer'), verifyUpiId);
paymentsRouter.post('/verify', requireAuth, requireRole('customer'), verifyPayment);
paymentsRouter.post('/webhook', handleWebhook);

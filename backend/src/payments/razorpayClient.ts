// Single Razorpay client instance — key_secret never leaves this process
// (it's only used server-side to sign the orders.create call). The
// customer app only ever receives back an order id + key_id, never the
// secret.
import Razorpay from 'razorpay';
import { env } from '../config/env.js';

export const razorpay = new Razorpay({
  key_id: env.razorpayKeyId,
  key_secret: env.razorpayKeySecret,
});

// Basic Auth header the razorpay npm SDK builds internally — needed here
// too because the SDK has no wrapped method for the S2S UPI Intent
// endpoint (createUpiIntent.ts), only the common orders/payments/refunds
// surface. Shared so any future direct REST call to Razorpay (there will
// be more — see CLAUDE.md/PRD's payout automation plans) doesn't
// reimplement this.
export function razorpayBasicAuthHeader(): string {
  return `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}`;
}

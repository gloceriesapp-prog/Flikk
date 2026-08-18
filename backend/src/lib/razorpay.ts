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

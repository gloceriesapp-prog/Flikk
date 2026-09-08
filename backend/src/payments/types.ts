export interface OrderIdBody {
  // Our own `orders.id` (from POST /orders) — required so the webhook
  // (webhook.ts) can write razorpay_payment_id back to the right row via
  // notes.flikk_order_id.
  orderId: string;
}

export interface VerifyPaymentBody {
  orderId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

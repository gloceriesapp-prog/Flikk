export interface OrderIdBody {
  // Our own `orders.id` (from POST /orders) — required so the webhook
  // (webhook.ts) can write razorpay_payment_id back to the right row via
  // notes.gloceries_order_id. Exactly one of orderId/tripId is set — never
  // both — the caller (apps/customer's CheckoutScreen) already knows which
  // one it just created (POST /orders vs POST /trips, useCartStore's own
  // selectCartStoreCount).
  orderId?: string;
  // Our own `trips.id` (from POST /trips, a multi-store checkout) — the
  // amount/ownership check reads trips.total instead of orders.total, and
  // a successful payment writes razorpay_payment_id onto the trip AND
  // cascades it onto every child order (createOrder.ts/verifyPayment.ts's
  // own notes) so nothing downstream needs to know trips exist to answer
  // "is this order paid".
  tripId?: string;
}

export interface VerifyPaymentBody {
  orderId?: string;
  tripId?: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

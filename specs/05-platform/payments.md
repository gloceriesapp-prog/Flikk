# Payments

## Purpose

Razorpay UPI checkout — customer app only. Highest-risk integration in the whole build; treat accordingly.

## Scope

- Customer app only. Partner, rider, and admin never touch Razorpay directly.
- UPI-first. Razorpay handles all card/UPI credential data — PCI-DSS scope stays entirely off Flikk's infrastructure.
- Backend holds the Razorpay keys ([`../00-foundation/environments-and-config.md`](../00-foundation/environments-and-config.md)); the customer app never sees a secret key, only whatever public/checkout token Razorpay's client SDK requires.

## Flow

1. Customer completes cart, hits checkout (screen C8, [`../01-customer-app/screens.md`](../01-customer-app/screens.md)).
2. `POST /orders` ([`../00-foundation/api-conventions.md`](../00-foundation/api-conventions.md)) validates stock, locks prices, creates the order in `placed` status within a transaction, and initiates a Razorpay payment intent.
3. Customer completes payment via Razorpay's checkout UI (in-app).
4. Razorpay calls `POST /payments/webhook` with the payment result.
5. Backend verifies the webhook signature (mandatory — reject unsigned/invalid payloads), then updates `orders.razorpay_payment_id` and confirms the order.
6. On confirmed payment: order confirmation screen (C9) shows success; on failure: C9 shows the failure state, order does not proceed to `packed`.

## Rules

- Never trust a client-reported "payment succeeded" — the webhook, signature-verified, is the only source of truth for payment confirmation.
- No card/UPI detail ever touches Flikk's own database or logs.
- Test with real small-value transactions before considering the integration done — this is explicit in the build plan (Week 3) and worth repeating here: don't ship on sandbox-only testing for this one.

## Acceptance criteria

- [ ] Webhook signature verification rejects tampered/unsigned payloads (test with an intentionally invalid signature)
- [ ] Order only transitions out of an unconfirmed-payment state via the webhook path, never via a client call
- [ ] No card/UPI PAN, CVV, or full account data appears in backend logs or the database
- [ ] At least one real, small-value transaction completed end-to-end before Week 3 is considered done

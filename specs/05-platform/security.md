# Security

## Purpose

Consolidates security requirements referenced from every app spec. Not a follow-up phase — implemented alongside the feature it protects.

## Payment data

Razorpay handles all card/UPI credential data. PCI-DSS scope stays off Flikk's infrastructure entirely — Flikk never stores, logs, or transmits raw card/UPI account data. See [`payments.md`](payments.md).

## Authentication

Phone-OTP only, across all four roles. See [`../00-foundation/auth-and-roles.md`](../00-foundation/auth-and-roles.md).

## Data access — Supabase RLS

Enabled on every table, scoped per role: customer → own orders/addresses; store_owner → own store's products/orders/payouts; rider → own assignments/earnings; admin → all. Full policy table in [`../00-foundation/data-model.md`](../00-foundation/data-model.md).

## Approval gating

`users.is_approved` gates `store_owner` and `rider` app access until admin approval — prevents unvetted parties from appearing as live stores or riders in the product. See [`../00-foundation/auth-and-roles.md`](../00-foundation/auth-and-roles.md).

## Webhook security

Razorpay webhook signature verification on every payment callback — no payment state changes on an unsigned or invalid-signature request. See [`payments.md`](payments.md).

## Secrets scoping

No app holds a credential it doesn't need — Razorpay keys and Supabase service role key live in `/backend` only. Full table in [`../00-foundation/environments-and-config.md`](../00-foundation/environments-and-config.md).

## The two failure classes that matter most

Per `claude.md`'s code-review discipline: before merging anything touching `orders`, `payouts`, or `order_items`, specifically check for (1) money-math errors, (2) RLS policy gaps. These lose real money or leak real data; most other bugs are more forgiving to fix after the fact.

## Acceptance criteria

Covered individually by the acceptance criteria in `payments.md`, `../00-foundation/auth-and-roles.md`, `../00-foundation/data-model.md`, and `../00-foundation/environments-and-config.md` — this file has no additional standalone criteria, it's an index.

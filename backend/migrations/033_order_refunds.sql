-- Real refund tracking for customer-cancelled orders (PATCH /orders/:id/
-- status, backend/src/payments/refundPayment.ts). 'none' covers both "not
-- cancelled" and "cancelled COD order — nothing was ever charged, so
-- nothing to refund" — never a NULL, so every reader can treat this
-- column as always meaningful rather than needing a separate null-check
-- alongside it.
-- Deliberately per-order only, even for a multi-store trip leg — a trip's
-- own checkout charges once but each leg is still its own real order row
-- with its own amount (CLAUDE.md: "single-store-per-order at the schema
-- level"), and TrackOrderScreen already renders one order's status at a
-- time. A trip-wide rollup can be added later if a real need for one
-- shows up; not worth guessing at now.
alter table orders
  add column refund_status text not null default 'none'
    check (refund_status in ('none', 'processing', 'completed', 'failed')),
  add column razorpay_refund_id text,
  add column refunded_at timestamptz;

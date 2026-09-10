-- apps/rider's CancelOrderModal has always collected a real reason
-- (vehicle breakdown, unsafe address, etc.) from a fixed list, and
-- apps/partner's own reject flow does the same — but PATCH /orders/:id/
-- status (routes/orders.ts) only ever accepted a bare `status`, nowhere
-- for that reason to land. Nullable: every non-cancelled transition
-- leaves this alone.
alter table orders
  add column if not exists cancel_reason text;

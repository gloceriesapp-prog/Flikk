-- Post-pickup delivery-failure flow: 'failed' is a new terminal order status
-- reachable only from out_for_delivery (see backend/src/lib/orderStateMachine.ts).
-- The original status CHECK constraint (001_init.sql) hard-codes the allowed
-- set, so it must be widened here or every UPDATE to status='failed' throws a
-- check violation (23514) at runtime.
--
-- The failure REASON deliberately reuses the existing orders.cancel_reason
-- column — status ('failed' vs 'cancelled') disambiguates which flow wrote it,
-- so no new column is needed. There is likewise no failed_at timestamp column:
-- not required by the flow, and adding one is out of scope.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'failed'));

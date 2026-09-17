-- Address "delete" no longer hard-deletes when a real order references the
-- row (orders.address_id has no ON DELETE behavior, so that delete always
-- 23503'd — see routes/addresses.ts's old ADDRESS_IN_USE 409). A customer
-- doesn't care that a rider already delivered to an address in the past;
-- they just want it off their list. Soft-delete: archive it, keep the row
-- (and every past order's address_id) intact, hide it from GET /addresses.
alter table addresses add column if not exists deleted_at timestamptz;

create index if not exists addresses_active_idx on addresses (user_id) where deleted_at is null;

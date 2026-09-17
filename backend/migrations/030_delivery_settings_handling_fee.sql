-- Extends the same delivery_settings singleton (029) with the platform/
-- handling fee — per an explicit ask ("same for CART_HANDLING_FEE this
-- also i should able to add in admin page"), the flat per-order handling
-- fee moves from a hardcoded ₹5 constant to an admin-editable column,
-- same table rather than a second singleton for one more number.
alter table delivery_settings
  add column handling_fee numeric not null default 5 check (handling_fee >= 0);

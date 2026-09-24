-- Delivery OTP — a 4-digit code the customer reads off their own order
-- (TrackOrderScreen's rider card) and reads out to the rider at the door.
-- Generated when a rider marks the order out_for_delivery, verified when the
-- rider marks it delivered, then nulled on that same write so it can't be
-- reused ("expired once used"). One shared code across a trip's legs — the
-- out_for_delivery write reuses a sibling leg's code if the trip already has
-- one (backend/src/routes/orders.ts). Nullable: every order predating this
-- column simply has no code and never generated one.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp text;

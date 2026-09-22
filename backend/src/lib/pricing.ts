// Money math. Source: specs/00-foundation/data-model.md, PRD Section 22 (commission 12-18%, delivery fee flat ₹20-30).
// All amounts in rupees, 2dp. Never derive a total from live product prices —
// callers pass in unit_price_at_order values already locked at order-creation time.

// The one real commission rate, defined exactly once — routes/orders.ts
// and routes/trips.ts each used to hardcode their own local
// `COMMISSION_RATE` constant with an explicit comment admitting they were
// "kept in sync manually," and apps/partner's own OrderDetailScreen.tsx
// had a THIRD, different value (12%) baked into its own client-side
// recompute of the payout breakdown — three independent numbers standing
// in for what should always be one fact. Both routes now import this
// instead of declaring their own, and the partner app reads the real
// orders.commission_amount the backend actually computed with it (never
// recomputing a payout figure client-side, same rule screens/payouts/
// data.ts already established for the Payouts tab).
//
// This is now only the fallback value — the real, admin-editable rate
// lives in the platform_settings singleton (migrations/039), read via
// lib/platformSettings.ts's own getCommissionRate() at checkout time. Kept
// here (not deleted) so this "money math" file stays pure/DB-free and
// still has a real, sane default if that row is ever somehow missing.
export const DEFAULT_COMMISSION_RATE = 0.06;

export interface CartLine {
  unitPrice: number;
  quantity: number;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcItemTotal(lines: CartLine[]): number {
  const total = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  return round2(total);
}

export function calcCommission(itemTotal: number, commissionRate: number): number {
  if (commissionRate < 0 || commissionRate > 1) {
    throw new Error(`commissionRate out of range: ${commissionRate}`);
  }
  return round2(itemTotal * commissionRate);
}

// discountAmount/handlingFee both default to 0 — every existing call site
// (no promo applied, or written before the admin-editable handling fee
// existed) behaves exactly as before. handlingFee is a 4th param, not
// inserted before discountAmount, specifically so no existing positional
// call silently starts passing its discount where a handling fee is now
// read. Floored at 0: a discount can never make a total negative, no
// matter how it was computed upstream.
export function calcOrderTotal(itemTotal: number, deliveryFee: number, discountAmount = 0, handlingFee = 0): number {
  return round2(Math.max(itemTotal + deliveryFee + handlingFee - discountAmount, 0));
}

export function calcNetPayout(grossAmount: number, commissionDeducted: number): number {
  return round2(grossAmount - commissionDeducted);
}

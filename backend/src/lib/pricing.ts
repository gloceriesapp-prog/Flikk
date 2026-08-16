// Money math. Source: specs/00-foundation/data-model.md, PRD Section 22 (commission 12-18%, delivery fee flat ₹20-30).
// All amounts in rupees, 2dp. Never derive a total from live product prices —
// callers pass in unit_price_at_order values already locked at order-creation time.

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

export function calcOrderTotal(itemTotal: number, deliveryFee: number): number {
  return round2(itemTotal + deliveryFee);
}

export function calcNetPayout(grossAmount: number, commissionDeducted: number): number {
  return round2(grossAmount - commissionDeducted);
}

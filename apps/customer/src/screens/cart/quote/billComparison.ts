import type { CheckoutQuote } from '../../../api/checkout';

// Display-only comparison from the server's bill. Never used for charging.
// Extra pickups and the rider tip are counted once; coupons reduce only
// the actual payable total returned by the server.
export function originalBillTotal(bill: CheckoutQuote['bill']): number | undefined {
  const originalOrActual = (original: number | undefined, actual: number) =>
    original !== undefined && Number.isFinite(original) && original > actual ? original : actual;
  const total = originalOrActual(bill.originalItemTotal, bill.itemTotal)
    + originalOrActual(bill.originalBaseDeliveryFee, bill.baseDeliveryFee)
    + bill.additionalShopFee
    + originalOrActual(bill.originalHandlingFee, bill.handlingFee)
    + (bill.tipAmount ?? 0);
  const rounded = Math.round((total + Number.EPSILON) * 100) / 100;
  return Number.isFinite(rounded) && rounded > Math.round(bill.total * 100) / 100 ? rounded : undefined;
}

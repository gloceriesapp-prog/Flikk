import type { PartnerOrder } from './partnerApi';

// MONEY DEFINITION — the single source of truth for "what the store actually
// earns" on this dashboard, matching the backend EXACTLY (GET /partner/stats/
// today and the weekly payout rollup, backend/src/routes/partner.ts):
//
//   store net revenue = item_total − commission_amount
//
// The customer-paid `total` is GROSS (item_total + delivery_fee) and bundles
// in the platform's commission and the rider's delivery fee — money the store
// never receives — so summing `total` as "revenue" overstates store income.
// Every store-income figure on the dashboard sums NET via these helpers.
export function orderNetRevenue(order: Pick<PartnerOrder, 'item_total' | 'commission_amount'>): number {
  return order.item_total - order.commission_amount;
}

// Net revenue attributable to ONE item line in an order. commission_amount is
// an order-level figure, so to show net revenue per product we apportion it
// across the order's lines in proportion to each line's share of item_total
// (a line's gross = unit_price_at_order × quantity; the lines sum to
// item_total). Apportionment conserves the order total: the lines' nets sum
// back to orderNetRevenue(order).
export function lineNetRevenue(
  order: Pick<PartnerOrder, 'item_total' | 'commission_amount'>,
  lineGross: number,
): number {
  if (order.item_total <= 0) return 0;
  const netFactor = (order.item_total - order.commission_amount) / order.item_total;
  return lineGross * netFactor;
}

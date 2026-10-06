import type { ApiOrderItem } from '../../../api/orders';

interface StoredBill {
  item_total: number;
  delivery_fee: number;
  handling_fee?: number;
  discount_amount: number;
  total: number;
}

const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

export function calculateOrderBill(items: ApiOrderItem[], bill: StoredBill) {
  const mrps = items.map((item) => item.variant_mrp_at_order ?? item.unit_mrp_at_order);
  const hasMrpSnapshot = items.length > 0 && mrps.every((mrp, index) =>
    typeof mrp === 'number' && Number.isFinite(mrp) && mrp >= items[index].unit_price_at_order);
  const totalMrp = hasMrpSnapshot
    ? roundMoney(items.reduce((sum, item, index) => sum + mrps[index]! * item.quantity, 0))
    : null;
  const ourPrice = roundMoney(bill.item_total);
  const discount = roundMoney(bill.discount_amount ?? 0);
  // The stored total includes handling. Older API responses may omit its
  // field; derive only the residual of historical amounts, never live fees.
  const handlingFee = roundMoney(bill.handling_fee
    ?? Math.max(0, bill.total - ourPrice - bill.delivery_fee + discount));
  return {
    totalMrp,
    productDiscount: totalMrp === null ? null : roundMoney(Math.max(0, totalMrp - ourPrice)),
    ourPrice,
    discount,
    itemTotal: roundMoney(Math.max(0, ourPrice - discount)),
    deliveryFee: bill.delivery_fee,
    handlingFee,
    total: bill.total,
  };
}

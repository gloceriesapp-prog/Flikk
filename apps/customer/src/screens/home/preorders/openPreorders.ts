import { bookingDates, dayOpen, type PreorderSlot } from '../../../store/preorder';
import type { Product } from '../products/types';

// Pre-order products that still have a bookable day from now.
export function openPreorderProducts(data: { products: Product[]; slots: PreorderSlot[] } | undefined, now = new Date()) {
  const dates = bookingDates(now);
  const slots = data?.slots ?? [];
  return (data?.products ?? []).filter((product) =>
    product.isAvailable !== false &&
    dates.some((date) => dayOpen(date, product.preorder?.leadDays ?? 0, slots, now)),
  );
}

// Pre-orders (Home Pre-orders section; backend lib/preorders.ts): a cart is
// either all pre-order items from one shop, delivered on one chosen day and
// slot, or all quick-delivery items. Each pre-order product goes in at its
// bulk minimum and never drops below it.

export interface PreorderSlot { id: string; label: string; startsMinute: number; endsMinute: number }
// The cart's chosen delivery: India date (YYYY-MM-DD) + slot, and its label.
export interface CartPreorder { date: string; slotId: string; label: string }

// Bookable days from the earliest one; same window the server allows.
export const PREORDER_BOOKING_DAYS = 7;
const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;

export function bookingDates(leadDays: number, now = new Date()): string[] {
  const today = Date.parse(new Date(now.getTime() + IST_MS).toISOString().slice(0, 10));
  return Array.from({ length: PREORDER_BOOKING_DAYS }, (_, i) => new Date(today + (leadDays + i) * DAY_MS).toISOString().slice(0, 10));
}

export function dayLabel(date: string, now = new Date()): string {
  if (date === bookingDates(1, now)[0]) return 'Tomorrow';
  const d = new Date(`${date}T00:00:00Z`);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()];
  return `${weekday} ${d.getUTCDate()} ${month}`;
}

export function cartPreorder(date: string, slot: PreorderSlot, now = new Date()): CartPreorder {
  return { date, slotId: slot.id, label: `${dayLabel(date, now)} · ${slot.label}` };
}

// Why this product can't join the cart as it is, or null when it can.
export function cartConflict(items: { storeId: string; preorderMinQty?: number }[], product: { storeId: string; preorderMinQty?: number }): string | null {
  if (items.length === 0) return null;
  const cartIsPreorder = items[0]!.preorderMinQty != null;
  if (product.preorderMinQty == null) {
    return cartIsPreorder ? 'Your cart has a pre-order. Pre-orders are checked out on their own.' : null;
  }
  if (!cartIsPreorder) return 'Your cart has items for quick delivery. Pre-orders are checked out on their own.';
  return items[0]!.storeId === product.storeId ? null : 'Pre-order from one shop at a time.';
}

// "Fri 7 Nov, 7:00 – 9:00 AM" for an order's delivery window.
export function formatDeliveryWindow(from: string, until: string): string {
  const time = (iso: string) => {
    const d = new Date(Date.parse(iso) + IST_MS);
    const h = d.getUTCHours();
    return `${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  };
  const date = new Date(Date.parse(from) + IST_MS).toISOString().slice(0, 10);
  return `${dayLabel(date)}, ${time(from)} – ${time(until)}`;
}

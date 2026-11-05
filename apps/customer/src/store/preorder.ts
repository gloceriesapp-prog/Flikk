// Pre-orders (Home Pre-orders section; backend lib/preorders.ts): a cart is
// either all pre-order items from one shop, delivered on one chosen day and
// slot, or all quick-delivery items. Each pre-order product goes in at its
// bulk minimum and never drops below it.

export interface PreorderSlot { id: string; label: string; startsMinute: number; endsMinute: number }
// The cart's chosen delivery: India date (YYYY-MM-DD) + slot, and its label.
export interface CartPreorder { date: string; slotId: string; label: string }

// Bookable days: today and the next 4 (backend PREORDER_BOOKING_DAYS). A
// product's notice (lead days) greys out the first ones; a slot closes 2 hours
// before it starts (PREORDER_CUTOFF_MS).
export const PREORDER_BOOKING_DAYS = 5;
const PREORDER_CUTOFF_MS = 2 * 3_600_000;
const IST_MS = 330 * 60_000;
const DAY_MS = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayMs(now: Date): number {
  return Date.parse(new Date(now.getTime() + IST_MS).toISOString().slice(0, 10));
}

export function bookingDates(now = new Date()): string[] {
  const today = todayMs(now);
  return Array.from({ length: PREORDER_BOOKING_DAYS }, (_, i) => new Date(today + i * DAY_MS).toISOString().slice(0, 10));
}

export function daysAhead(date: string, now = new Date()): number {
  return Math.round((Date.parse(date) - todayMs(now)) / DAY_MS);
}

// The slot starts at least 2 hours from now on that day.
export function slotOpen(date: string, slot: PreorderSlot, now = new Date()): boolean {
  return Date.parse(`${date}T00:00:00+05:30`) + slot.startsMinute * 60_000 >= now.getTime() + PREORDER_CUTOFF_MS;
}

// A day can be booked: enough notice and at least one slot still open.
export function dayOpen(date: string, leadDays: number, slots: PreorderSlot[], now = new Date()): boolean {
  return daysAhead(date, now) >= leadDays && slots.some((slot) => slotOpen(date, slot, now));
}

// Cinema-style date card parts: "TODAY" / "TUE", "7", "Nov".
export function dayCard(date: string, now = new Date()): { top: string; day: number; month: string } {
  const d = new Date(`${date}T00:00:00Z`);
  const ahead = daysAhead(date, now);
  return { top: ahead === 0 ? 'Today' : ahead === 1 ? 'Tmrw' : WEEKDAYS[d.getUTCDay()]!, day: d.getUTCDate(), month: MONTHS[d.getUTCMonth()]! };
}

export function dayLabel(date: string, now = new Date()): string {
  const ahead = daysAhead(date, now);
  if (ahead === 0) return 'Today';
  if (ahead === 1) return 'Tomorrow';
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
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

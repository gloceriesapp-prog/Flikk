// Pure math for the Earnings tab — kept separate from the components, same
// split as utils/performance.ts, so the actual money logic has one place
// to live and reason about instead of being buried inside JSX. Every
// figure here is derived from real order data (data/mockOrders.ts's own
// mock generators), not random display numbers.
//
// Trimmed down to just what the current screen needs (week navigation,
// weekly balance, weekly activity chart) — the earlier stat-tile/
// transactions-history version of this file (availableBalance,
// payoutHistory, buildTransactions, etc.) was removed wholesale along
// with the screens that read it; see git history if any of that's needed
// again.

import type { RiderOrder } from '../data/mockOrders';

function orderTotal(order: RiderOrder): number {
  return order.payout + (order.tip ?? 0);
}

// Monday 00:00 local time of the week `date` falls in — payouts run every
// Monday, so a "week" here means a Monday-to-Monday pay period, not a
// rolling 7 days. Exported so useRiderOrdersStore's loadSampleWeek can
// spread its mock deliveries across the same real week boundaries this
// screen uses, instead of duplicating the Monday-backtrack math there.
export function startOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return start;
}

export interface WeekRange {
  start: Date;
  end: Date;
  label: string; // "12 Sep - 18 Sep"
  offset: number; // 0 = current week, -1 = the week before, etc. Never positive — no future earnings exist.
}

// `offset` counts Monday-to-Monday pay periods back from the current one
// — lets EarningsWeekHeader page backward through history instead of only
// ever showing "this week."
export function getWeekRange(offset: number): WeekRange {
  const start = startOfWeek(new Date());
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return {
    start,
    end,
    label: `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
    offset,
  };
}

function ordersInWeek(completedOrders: RiderOrder[], week: WeekRange): RiderOrder[] {
  const exclusiveEnd = new Date(week.end);
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
  exclusiveEnd.setHours(0, 0, 0, 0);

  return completedOrders.filter((order) => {
    if (!order.deliveredAt) return false;
    const d = new Date(order.deliveredAt);
    return d >= week.start && d < exclusiveEnd;
  });
}

export function sumEarningsForWeek(completedOrders: RiderOrder[], week: WeekRange): number {
  return ordersInWeek(completedOrders, week).reduce((sum, order) => sum + orderTotal(order), 0);
}

export function sumTipsForWeek(completedOrders: RiderOrder[], week: WeekRange): number {
  return ordersInWeek(completedOrders, week).reduce((sum, order) => sum + (order.tip ?? 0), 0);
}

export interface WeeklyActivityDay {
  label: string; // "Mon" / "Tue" / ... — the component swaps this for "Today" when isToday is true
  total: number;
  isToday: boolean;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Per-day breakdown for whichever week is currently selected (not always
// "this week") — isToday only ever true when the real current date falls
// inside the selected week, so paging to a past week correctly shows no
// "Today" bar/tooltip.
export function getWeeklyActivity(completedOrders: RiderOrder[], week: WeekRange): WeeklyActivityDay[] {
  const now = new Date();
  const orders = ordersInWeek(completedOrders, week);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(week.start);
    day.setDate(day.getDate() + index);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const total = orders
      .filter((order) => {
        const d = new Date(order.deliveredAt!);
        return d >= day && d < dayEnd;
      })
      .reduce((sum, order) => sum + orderTotal(order), 0);

    return { label: WEEKDAY_LABELS[index], total, isToday: day.toDateString() === now.toDateString() };
  });
}

export interface WeekTransaction {
  id: string;
  title: string;
  subtitle: string;
  date: string; // ISO
  amount: number; // always positive — "All" only ever lists money received
}

// One row per delivery in the selected week — this is what the "All"
// tab reads (user's own framing: "all means where all i got money").
export function getEarningsForWeek(completedOrders: RiderOrder[], week: WeekRange): WeekTransaction[] {
  return ordersInWeek(completedOrders, week)
    .map((order) => ({
      id: order.id,
      title: order.storeName,
      subtitle: order.orderNumber,
      date: order.deliveredAt!,
      amount: orderTotal(order),
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Payouts run automatically every Monday — there is never a rider-
// initiated withdrawal, so "Withdraw" (user's own framing: "from where we
// have took money") lists past pay periods that have actually been paid
// out already, not a fake ledger. The current week (offset === 0) hasn't
// been paid yet — nothing to show there until it's over. A past week with
// ₹0 earned genuinely has no payout, so that returns nothing too.
export function getWithdrawalForWeek(completedOrders: RiderOrder[], week: WeekRange): WeekTransaction | null {
  if (week.offset >= 0) return null;

  const total = sumEarningsForWeek(completedOrders, week);
  if (total <= 0) return null;

  const payoutDate = new Date(week.end);
  payoutDate.setDate(payoutDate.getDate() + 1); // paid out the Monday right after this week ends

  return {
    id: `payout-${week.start.getTime()}`,
    title: 'Weekly payout',
    subtitle: `To your linked bank account · ${week.label}`,
    date: payoutDate.toISOString(),
    amount: total,
  };
}

// Pure math for the Earnings tab — kept separate from the components so the
// money logic has one place to live and reason about instead of being buried
// inside JSX. Operates on server-derived RiderEarning[] (api/earnings.ts):
// each row is one settled order or one whole trip, with a real base vs
// extra-stop split the backend recomputed. No fabricated dimensions
// (distance/surge/tip don't exist server-side).
//
// Week boundaries are Monday-to-Monday pay periods (payouts run every
// Monday), and every figure buckets on deliveredAt.

import type { RiderEarning } from '../api/earnings';

// Monday 00:00 local time of the week `date` falls in. Exported for reuse.
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
// — lets EarningsWeekHeader page backward through history.
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

// "This week", "Last week", "N weeks ago" (offset is never positive).
export function relativeWeekLabel(offset: number): string {
  if (offset === 0) return 'This week';
  if (offset === -1) return 'Last week';
  return `${-offset} weeks ago`;
}

function earningsInWeek(earnings: RiderEarning[], week: WeekRange): RiderEarning[] {
  const exclusiveEnd = new Date(week.end);
  exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
  exclusiveEnd.setHours(0, 0, 0, 0);

  return earnings.filter((e) => {
    if (!e.deliveredAt) return false;
    const d = new Date(e.deliveredAt);
    return d >= week.start && d < exclusiveEnd;
  });
}

// Total earned, split into base pay + extra-stop surcharge, and a count.
// These are the only real dimensions the backend exposes.
export interface EarningsBreakdown {
  total: number;
  base: number;
  extraStop: number;
  count: number;
}

function breakdownForEarnings(earnings: RiderEarning[]): EarningsBreakdown {
  return earnings.reduce<EarningsBreakdown>(
    (acc, e) => {
      acc.total += e.amount;
      acc.base += e.baseFee;
      acc.extraStop += e.extraStopFee;
      acc.count += 1;
      return acc;
    },
    { total: 0, base: 0, extraStop: 0, count: 0 },
  );
}

export function breakdownForWeek(earnings: RiderEarning[], week: WeekRange): EarningsBreakdown {
  return breakdownForEarnings(earningsInWeek(earnings, week));
}

// Today = earnings whose deliveredAt falls on the real current calendar day
// (local), independent of the week the header has paged to.
export function breakdownForToday(earnings: RiderEarning[]): EarningsBreakdown {
  const now = new Date();
  const today = earnings.filter((e) => e.deliveredAt && new Date(e.deliveredAt).toDateString() === now.toDateString());
  return breakdownForEarnings(today);
}

export interface WeeklyActivityDay {
  label: string; // "Mon" / "Tue" / ... — the component swaps this for "Today" when isToday is true
  total: number;
  isToday: boolean;
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Per-day totals for the selected week's bar chart. isToday is only true when
// the real current date falls inside the selected week.
export function getWeeklyActivity(earnings: RiderEarning[], week: WeekRange): WeeklyActivityDay[] {
  const now = new Date();
  const inWeek = earningsInWeek(earnings, week);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(week.start);
    day.setDate(day.getDate() + index);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const total = inWeek
      .filter((e) => {
        const d = new Date(e.deliveredAt!);
        return d >= day && d < dayEnd;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return { label: WEEKDAY_LABELS[index], total, isToday: day.toDateString() === now.toDateString() };
  });
}

// One transaction row per earning in the selected week — the headline
// per-order breakdown the Transactions card renders (base + extra-stop).
export interface WeekTransaction {
  id: string;
  title: string; // store name, or "N-stop trip" for a multi-store trip
  subtitle: string; // order number
  date: string; // ISO (deliveredAt)
  amount: number;
  base: number;
  extraStop: number;
  isTrip: boolean;
  status: 'paid' | 'pending';
}

function transactionTitle(e: RiderEarning): string {
  if (e.isTrip) return `${e.stopCount}-stop trip`;
  return e.storeName ?? 'Delivery';
}

export function getEarningsForWeek(earnings: RiderEarning[], week: WeekRange): WeekTransaction[] {
  return earningsInWeek(earnings, week)
    .map((e) => ({
      id: e.id,
      title: transactionTitle(e),
      subtitle: e.orderNumber ?? '',
      date: e.deliveredAt!,
      amount: e.amount,
      base: e.baseFee,
      extraStop: e.extraStopFee,
      isTrip: e.isTrip,
      status: e.status,
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

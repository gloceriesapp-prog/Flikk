// completedOrders is now the full persisted history (useRiderOrdersStore's
// own note) — screens that only want "today" (Home's stat row, Earnings'
// Today tab) filter deliveredAt against these instead of assuming the
// array itself is scoped to the current day.

export function isSameDay(isoA: string, isoB: string): boolean {
  return isoA.slice(0, 10) === isoB.slice(0, 10);
}

export function isToday(iso: string): boolean {
  return isSameDay(iso, new Date().toISOString());
}

// UTC calendar-day key ("2026-09-23") — same day boundary isSameDay/isToday
// use, so active-time and today's-delivery-count roll over together at the
// same midnight. Shared by the store's daily active-time accumulator.
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isWithinLastDays(iso: string, days: number): boolean {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= cutoff;
}

// "Mon, 12 Aug" — grouping label for a date-bucketed history list.
export function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// "23 Sep" — today's date, hand-formatted (Hermes ships no full ICU, so no
// Intl month names). Shared by Home's earnings-card date label.
export function todayLabel(): string {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// "0m" / "45m" / "2h 15m" — how long the rider has been online this
// session (Home's "Online for" card). Minutes only below an hour, same
// "don't show a unit that's always zero" logic as
// useRiderOrdersStore's other formatters.
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

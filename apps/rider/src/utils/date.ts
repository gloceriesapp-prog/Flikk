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

export function isWithinLastDays(iso: string, days: number): boolean {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(iso).getTime() >= cutoff;
}

// "Mon, 12 Aug" — grouping label for a date-bucketed history list.
export function formatDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
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

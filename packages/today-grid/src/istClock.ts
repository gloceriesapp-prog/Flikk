// India time from an instant: the grid never depends on the server time zone.
const IST_OFFSET_MS = 330 * 60_000;

export interface IstClock { minute: number; hour: number; date: string; dayOfMonth: number; weekday: number }

export function istClock(now: Date): IstClock {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  const hour = shifted.getUTCHours();
  return { minute: hour * 60 + shifted.getUTCMinutes(), hour, date: shifted.toISOString().slice(0, 10), dayOfMonth: shifted.getUTCDate(), weekday: shifted.getUTCDay() };
}
// Half-open [from, to) in minutes; wraps past midnight when from > to.
export function inWindow(minute: number, from: number, to: number): boolean {
  return from <= to ? minute >= from && minute < to : minute >= from || minute < to;
}
// Next IST midnight after `now` (daily inputs expire then).
export function nextIstMidnight(now: Date): Date {
  return new Date(Date.parse(`${istClock(now).date}T00:00:00+05:30`) + 86_400_000);
}
// "7:30 AM"; whole hours as "4 AM" when short is set.
export function formatIstMinute(minuteOfDay: number, short = false): string {
  const m = ((Math.trunc(minuteOfDay) % 1440) + 1440) % 1440;
  const hour = Math.floor(m / 60);
  const text = `${hour % 12 === 0 ? 12 : hour % 12}:${String(m % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
  return short ? text.replace(':00 ', ' ') : text;
}

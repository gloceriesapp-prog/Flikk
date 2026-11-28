// India time from an instant, without Date.now(): every caller passes `now`
// so the grid is deterministic and the server's own time zone never matters.
const IST_OFFSET_MS = 330 * 60_000;

export interface IstClock {
  minute: number; // minutes since IST midnight, 0..1439
  hour: number;
  date: string; // YYYY-MM-DD in IST
  dayOfMonth: number;
  weekday: number; // 0 = Sunday … 6 = Saturday
}

export function istClock(now: Date): IstClock {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  const hour = shifted.getUTCHours();
  return {
    minute: hour * 60 + shifted.getUTCMinutes(),
    hour,
    date: shifted.toISOString().slice(0, 10),
    dayOfMonth: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

// Half-open [from, to) in minutes; wraps past midnight when from > to.
export function inWindow(minute: number, from: number, to: number): boolean {
  return from <= to ? minute >= from && minute < to : minute >= from || minute < to;
}

export { formatIstMinute } from '../lib/orderingHours.js';

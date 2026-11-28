// India time from an instant, without Date.now(): every caller passes `now`
// so the grid is deterministic and the server's own time zone never matters.
const IST_OFFSET_MS = 330 * 60_000;
export function istClock(now) {
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
export function inWindow(minute, from, to) {
    return from <= to ? minute >= from && minute < to : minute >= from || minute < to;
}
// "7:30 AM" for an IST minute of the day (same format as lib/orderingHours).
export function formatIstMinute(minuteOfDay) {
    const m = ((Math.trunc(minuteOfDay) % 1440) + 1440) % 1440;
    const hour = Math.floor(m / 60);
    return `${hour % 12 === 0 ? 12 : hour % 12}:${String(m % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

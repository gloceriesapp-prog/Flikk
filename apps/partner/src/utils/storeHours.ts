// Store hours are local Indian wall-clock times, not UTC timestamps.
export function normalizeStoreHour(value: string): string | null {
  const text = value.trim();
  if (!text) return '';
  const clock = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(text);
  if (clock) return `${clock[1].padStart(2, '0')}:${clock[2]}`;
  const twelve = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i.exec(text);
  if (!twelve) return null;
  const hour = Number(twelve[1]) % 12 + (twelve[3].toUpperCase() === 'PM' ? 12 : 0);
  return `${String(hour).padStart(2, '0')}:${twelve[2]}`;
}

export function storeHourDisplay(value: string, fallback: 'AM' | 'PM') {
  const canonical = normalizeStoreHour(value);
  if (canonical) {
    const [hour, minute] = canonical.split(':');
    return { text: `${Number(hour) % 12 || 12}:${minute}`, period: Number(hour) >= 12 ? 'PM' as const : 'AM' as const };
  }
  const period = /PM$/i.test(value.trim()) ? 'PM' : /AM$/i.test(value.trim()) ? 'AM' : fallback;
  return { text: value.replace(/\s*(AM|PM)$/i, ''), period };
}

export function storeHourFromDigits(raw: string, period: 'AM' | 'PM'): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';
  const text = digits.length < 3 ? digits : `${digits.slice(0, -2)}:${digits.slice(-2)}`;
  return normalizeStoreHour(`${text} ${period}`) ?? `${text} ${period}`;
}

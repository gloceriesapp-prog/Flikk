export interface StoreOpening {
  isActive: boolean;
  openTime?: string | null;
  closeTime?: string | null;
}

function minutes(value?: string | null): number | null {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})(?::00)?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minute > 59 || (period ? hour < 1 || hour > 12 : hour > 23)) return null;
  if (period) hour = hour % 12 + (period === 'PM' ? 12 : 0);
  return hour * 60 + minute;
}

// Mirrors server eligibility (IST), including overnight and 24-hour shops.
// UI never authorizes checkout; the backend rechecks this transactionally.
export function shopIsOpen(store: StoreOpening, date = new Date()): boolean {
  if (!store.isActive) return false;
  if (!store.openTime && !store.closeTime) return true;
  const open = minutes(store.openTime), close = minutes(store.closeTime);
  if (open == null || close == null) return false;
  const ist = new Date(date.getTime() + 330 * 60_000);
  const now = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return open === close || (open < close ? now >= open && now < close : now >= open || now < close);
}

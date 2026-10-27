// Hand-picked products on the customer Home "All" tab (migration
// 20261027150000). Which sections take products, and how many cards each
// shows on the phone (pins fill the first slots; the rest is automatic unless
// the section is "pinned only"). Keep in step with ROW_PRIORITY caps in
// apps/customer/src/screens/home/sections/AllTabSections.tsx.

export const PIN_CAPACITY: Record<string, number> = {
  trending: 6,
  'most-bought': 6,
  'deals-for-you': 8,
  'todays-best-deals': 6,
  'price-drops': 4,
  'everyday-essentials': 9,
};
export const CUSTOM_SECTION_CAPACITY = 12;
export const MAX_PINS = 30;

export const isCustomSection = (key: string) => /^custom-[a-z0-9]{6,32}$/.test(key);
export const acceptsPins = (key: string) => key in PIN_CAPACITY || isCustomSection(key);
export const pinCapacity = (key: string) => PIN_CAPACITY[key] ?? (isCustomSection(key) ? CUSTOM_SECTION_CAPACITY : 0);

export function newCustomSectionKey(random: () => number = Math.random) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return `custom-${Array.from({ length: 8 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('')}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseProductIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || !UUID.test(id))) throw new Error('Choose valid products.');
  if (new Set(value).size !== value.length) throw new Error('A product can be pinned only once per section.');
  if (value.length > MAX_PINS) throw new Error(`A section can pin at most ${MAX_PINS} products.`);
  return value as string[];
}

// <input type="datetime-local"> value (India time) <-> ISO instant.
export function scheduleToIso(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const local = /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) ? `${value}:00+05:30` : value;
  const at = Date.parse(local);
  if (!Number.isFinite(at)) throw new Error('Enter a valid date and time.');
  return new Date(at).toISOString();
}
export function isoToScheduleInput(iso: string | null): string {
  if (!iso) return '';
  const ist = new Date(Date.parse(iso) + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}

// Postgres raises P0400/P0404 with a readable message for pin rule breaks.
export function pinErrorStatus(err: unknown) {
  const code = (err as { code?: string } | null)?.code;
  return code === 'P0400' ? 400 : code === 'P0404' ? 404 : 500;
}

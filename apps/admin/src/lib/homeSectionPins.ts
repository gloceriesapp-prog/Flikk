import { homePreviewLimit, homeProductLayout, isCustomHomeSection } from '../../../../packages/home-content/sectionLayout.js';

const FIXED_PIN_CAPACITY = new Map([['price-drops', 4]]);
export const MAX_PINS = 30;

export const isCustomSection = isCustomHomeSection;
export const acceptsPins = (key: string) => FIXED_PIN_CAPACITY.has(key) || homeProductLayout(key) !== null;
export function pinCapacity(key: string, displayLayout?: unknown) {
  const layout = homeProductLayout(key, displayLayout);
  return layout ? homePreviewLimit(layout) : (FIXED_PIN_CAPACITY.get(key) ?? 0);
}

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

// Delivery time per product category (category_delivery_windows, migration
// 20261129090000), edited on Settings. An order with any item in such a
// category promises the window's max; the app shows "min–max min · note".

export interface DeliveryWindow { category: string; minMinutes: number; maxMinutes: number; note: string | null }

const NOTE_MAX = 30;

// Whole list as sent by the Settings card; throws a message the admin can act on.
export function validateDeliveryWindows(raw: unknown): DeliveryWindow[] {
  const rows = (raw as { windows?: unknown })?.windows;
  if (!Array.isArray(rows)) throw new Error('Send the list of category delivery times.');
  const seen = new Set<string>();
  return rows.map((row: Record<string, unknown>) => {
    const category = typeof row.category === 'string' ? row.category.trim() : '';
    if (!category || category.length > 60) throw new Error('Pick a category for every row.');
    if (seen.has(category.toLowerCase())) throw new Error(`"${category}" is listed twice.`);
    seen.add(category.toLowerCase());
    const min = Number(row.minMinutes), max = Number(row.maxMinutes);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max > 240) throw new Error(`${category}: times must be whole minutes between 1 and 240.`);
    if (max < min) throw new Error(`${category}: the longest time must not be shorter than the shortest.`);
    const note = typeof row.note === 'string' && row.note.trim() ? row.note.trim() : null;
    if (note && note.length > NOTE_MAX) throw new Error(`${category}: keep the note to ${NOTE_MAX} characters.`);
    return { category, minMinutes: min, maxMinutes: max, note };
  });
}

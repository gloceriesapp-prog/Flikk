// Delivery time for what the customer is looking at. Normal: the one
// estimate from Settings. A category with its own window (Settings →
// Delivery time by category, e.g. Non Veg 45–60 min "cut fresh") shows that
// range instead, and a cart holding it takes the slowest window: one
// delivery, so the slowest item sets the time. The order's recorded promise
// is raised to the same max by the database (migration 20261129090000).

export interface CategoryDeliveryWindow { category: string; minMinutes: number; maxMinutes: number; note: string | null }
export interface DeliveryWindow { min: number; max: number; note: string | null; category: string | null }

export function deliveryWindowFor(categories: (string | null | undefined)[], baseMinutes: number, windows: CategoryDeliveryWindow[] = []): DeliveryWindow {
  const wanted = new Set(categories.filter((c): c is string => !!c).map((c) => c.trim().toLowerCase()));
  const slowest = windows
    .filter((w) => wanted.has(w.category.trim().toLowerCase()) && w.maxMinutes > baseMinutes)
    .sort((a, b) => b.maxMinutes - a.maxMinutes)[0];
  return slowest
    ? { min: Math.max(slowest.minMinutes, baseMinutes), max: slowest.maxMinutes, note: slowest.note, category: slowest.category }
    : { min: baseMinutes, max: baseMinutes, note: null, category: null };
}

// "35 mins" or "45–60 mins".
export function formatWindow({ min, max }: Pick<DeliveryWindow, 'min' | 'max'>): string {
  return min === max ? `${min} mins` : `${min}–${max} mins`;
}

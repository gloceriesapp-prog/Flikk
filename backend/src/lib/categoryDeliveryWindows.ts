// Delivery window per product category (migration 20261129090000), e.g.
// "Non Veg" 45-60 min, "cut fresh". Served with GET /delivery-settings so
// the app shows the range on those products, their section and the cart;
// the database itself raises an order's recorded promise to the max.
import { supabase } from '../db/supabase.js';

export interface CategoryDeliveryWindow { category: string; minMinutes: number; maxMinutes: number; note: string | null }

const minutes = (value: unknown) => (Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 240 ? Number(value) : null);

export function mapCategoryWindows(rows: unknown[] | null | undefined): CategoryDeliveryWindow[] {
  return (rows ?? []).flatMap((raw) => {
    const row = raw as Record<string, unknown>;
    const min = minutes(row.min_minutes), max = minutes(row.max_minutes);
    const category = typeof row.category === 'string' ? row.category.trim() : '';
    if (!category || min == null || max == null || max < min) return [];
    const note = typeof row.note === 'string' && row.note.trim() ? row.note.trim() : null;
    return [{ category, minMinutes: min, maxMinutes: max, note }];
  });
}

// A failed read leaves windows out (normal times everywhere) rather than
// failing the whole delivery-settings response.
export async function getCategoryDeliveryWindows(): Promise<CategoryDeliveryWindow[]> {
  const { data, error } = await supabase.from('category_delivery_windows').select('category, min_minutes, max_minutes, note').order('category');
  if (error) return [];
  return mapCategoryWindows(data);
}

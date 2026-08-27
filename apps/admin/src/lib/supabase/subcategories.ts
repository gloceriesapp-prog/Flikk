// Maps between the real public.sub_categories row and this dashboard's own
// SubCategory type, plus the one client-side read EditCategoryModal needs
// (fetchSubCategories — covered by the public sub_categories_read_active
// RLS policy). Writes live in app/api/subcategories/* instead, same
// rationale as lib/supabase/categories.ts's own note.

import { supabase } from './client';

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
}

export interface SubCategoryRow {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
}

export const SUB_CATEGORY_SELECT = 'id, category_id, name, sort_order';

export function mapRowToSubCategory(row: SubCategoryRow): SubCategory {
  return { id: row.id, categoryId: row.category_id, name: row.name, sortOrder: row.sort_order };
}

export async function fetchSubCategories(categoryId: string): Promise<SubCategory[]> {
  const { data, error } = await supabase
    .from('sub_categories')
    .select(SUB_CATEGORY_SELECT)
    .eq('category_id', categoryId)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return (data as SubCategoryRow[]).map(mapRowToSubCategory);
}

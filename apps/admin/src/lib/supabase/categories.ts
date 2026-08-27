// Maps between the real public.categories row and this dashboard's Category
// type (lib/types.ts), plus the one client-side read the Categories page
// needs (fetchCategories — covered by the public categories_read_active RLS
// policy, no service-role key needed here). Writes live in
// app/api/categories/* instead, same rationale as lib/supabase/products.ts's
// own note.

import { supabase } from './client';
import type { Category } from '../types';

export interface CategoryRow {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  section_id: string | null;
}

export const CATEGORY_SELECT = 'id, name, image_url, sort_order, is_active, section_id';

export function mapRowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url ?? undefined,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    sectionId: row.section_id ?? undefined,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select(CATEGORY_SELECT).order('sort_order').order('name');
  if (error) throw error;
  return (data as CategoryRow[]).map(mapRowToCategory);
}

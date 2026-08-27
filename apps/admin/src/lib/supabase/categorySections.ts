// Maps between the real public.category_sections row and this dashboard's
// CategorySection type (lib/types.ts), plus the client-side read the
// Categories page needs (fetchCategorySections — public
// category_sections_read_all RLS, no service-role key). Writes live in
// app/api/category-sections/* instead, same rationale as
// lib/supabase/categories.ts's own note.

import { supabase } from './client';
import type { CategorySection } from '../types';

export interface CategorySectionRow {
  id: string;
  name: string;
  sort_order: number;
}

export const CATEGORY_SECTION_SELECT = 'id, name, sort_order';

export function mapRowToCategorySection(row: CategorySectionRow): CategorySection {
  return { id: row.id, name: row.name, sortOrder: row.sort_order };
}

export async function fetchCategorySections(): Promise<CategorySection[]> {
  const { data, error } = await supabase.from('category_sections').select(CATEGORY_SECTION_SELECT).order('sort_order').order('name');
  if (error) throw error;
  return (data as CategorySectionRow[]).map(mapRowToCategorySection);
}

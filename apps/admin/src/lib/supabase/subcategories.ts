// Maps between the real public.sub_categories row and this dashboard's own
// SubCategory type, plus the client-side reads this dashboard needs
// (fetchSubCategories — EditCategoryModal's own list; fetchAllSubCategories
// — Add/EditProductModal's flat "Show in category browse" picker). Both
// covered by the public sub_categories_read_active RLS policy. Writes live
// in app/api/subcategories/* instead, same rationale as
// lib/supabase/categories.ts's own note.

import { supabase } from './client';

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  imageUrl?: string;
  sortOrder: number;
}

export interface SubCategoryRow {
  id: string;
  category_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
}

export const SUB_CATEGORY_SELECT = 'id, category_id, name, image_url, sort_order';

export function mapRowToSubCategory(row: SubCategoryRow): SubCategory {
  return { id: row.id, categoryId: row.category_id, name: row.name, imageUrl: row.image_url ?? undefined, sortOrder: row.sort_order };
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

// Flat "Title / Sub-category" list for the product form's own picker —
// products.sub_category_id is independent of products.category (the
// free-text field on that same form, PRODUCT_CATEGORIES) since the two
// taxonomies aren't unified yet; see backend/src/routes/categories.ts's
// own note on that gap.
export interface SubCategoryOption {
  id: string;
  label: string;
}

interface SubCategoryWithParentRow {
  id: string;
  name: string;
  categories: { name: string } | null;
}

export async function fetchAllSubCategoryOptions(): Promise<SubCategoryOption[]> {
  const { data, error } = await supabase
    .from('sub_categories')
    .select('id, name, categories(name)')
    .order('name');
  if (error) throw error;
  return (data as unknown as SubCategoryWithParentRow[]).map((row) => ({
    id: row.id,
    label: row.categories ? `${row.categories.name} / ${row.name}` : row.name,
  }));
}

// The catalogue tree for the product form's one picker: every category (in
// Categories-page order) with its sub-categories. A product is filed under a
// sub-category and takes its category from it (migration 20261104140000).
export interface CatalogueTreeCategory {
  id: string;
  name: string;
  subCategories: { id: string; name: string }[];
}

export async function fetchCatalogueTree(): Promise<CatalogueTreeCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, sub_categories(id, name, sort_order)')
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return (data as unknown as { id: string; name: string; sub_categories: { id: string; name: string; sort_order: number | null }[] | null }[])
    .map((row) => ({
      id: row.id,
      name: row.name,
      subCategories: [...(row.sub_categories ?? [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
        .map(({ id, name }) => ({ id, name })),
    }));
}

// Master item list (catalogue_items, from the supermarket catalogue sheet):
// the items stores may sell, each filed under a sidebar sub-category. Admin
// picks one when adding a product (name + sub-category fill in), and an item
// counts as added once a product is linked to it.

export interface CatalogueItem {
  id: string;
  name: string;
  subCategoryId: string | null;
  subCategoryName: string | null;
  categoryName: string | null;
  sectionName: string | null;
  added: boolean;
}

export interface CatalogueProgressRow {
  sectionName: string;
  total: number;
  added: number;
}

export const CATALOGUE_ITEM_SELECT = 'id, name, sub_category_id, sub_category_name, category_name, section_name, added';

export type CatalogueItemRow = {
  id: string; name: string; sub_category_id: string | null; sub_category_name: string | null;
  category_name: string | null; section_name: string | null; added: boolean;
};

export const toCatalogueItem = (row: CatalogueItemRow): CatalogueItem => ({
  id: row.id, name: row.name, subCategoryId: row.sub_category_id, subCategoryName: row.sub_category_name,
  categoryName: row.category_name, sectionName: row.section_name, added: row.added,
});

// Search text for an ILIKE "contains" match: trimmed, collapsed, with the
// LIKE wildcards % and _ (and the escape \) taken literally.
export function containsPattern(query: string): string | null {
  const text = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  return text.length < 2 ? null : `%${text.replace(/[\\%_]/g, '\\$&')}%`;
}

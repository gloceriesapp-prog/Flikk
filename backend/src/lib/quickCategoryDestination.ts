export function resolveQuickDestination(tab: { quick_destination_type?: string | null; quick_category_id?: string | null; quick_subcategory_id?: string | null }, activeCategories: Set<string>, subcategoryParents: Map<string, string>) {
  const category = tab.quick_category_id;
  const subcategory = tab.quick_subcategory_id;
  const parent = subcategory ? subcategoryParents.get(subcategory) : undefined;
  const link = category && activeCategories.has(category)
    ? { type: 'category' as const, id: category, category_id: category }
    : subcategory && parent && activeCategories.has(parent)
      ? { type: 'subcategory' as const, id: subcategory, category_id: parent }
      : null;
  return { configured: Boolean(tab.quick_destination_type || category || subcategory), link };
}

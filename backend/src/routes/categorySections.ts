// Customer-facing grouped category browse — "Title, then a row of
// category images underneath it" (apps/customer/src/components/
// CategorySections/), real rows a founder manages via admin's own
// Categories screen: category_sections is the title, categories.section_id
// is which title a category belongs to (apps/admin/src/components/
// categories/SectionPicker.tsx sets it when adding/editing a category).
//
// Sections with zero categories are still returned (a founder may have
// just created the title and not added categories yet) — the customer app
// skips rendering an empty one rather than this route hiding it, same
// convention CategorySectionGroup.tsx already used before real data
// existed.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const categorySectionsRouter = Router();

categorySectionsRouter.get('/', async (req, res, next) => {
  try {
    const { data: sections, error: sectionsError } = await supabase
      .from('category_sections')
      .select('id, name, sort_order')
      .order('sort_order')
      .order('name');
    if (sectionsError) throw sectionsError;

    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, image_url, sort_order, section_id')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (categoriesError) throw categoriesError;

    const grouped = sections.map((section) => ({
      id: section.id,
      name: section.name,
      categories: categories
        .filter((c) => c.section_id === section.id)
        .map((c) => ({ id: c.id, name: c.name, image_url: c.image_url })),
    }));

    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

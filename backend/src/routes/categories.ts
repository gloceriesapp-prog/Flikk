// Customer-facing category browse — real rows a founder manages via
// admin's own Categories screen (apps/admin/src/app/(dashboard)/categories),
// not the static CATEGORY_SECTIONS mock apps/customer used to render.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Sub-categories for one top category — CategoryDetailScreen's own sidebar
// (apps/customer/src/screens/category-detail/components/SubCategorySidebar.tsx).
// Real rows a founder manages via admin's own Categories screen (the same
// edit-category modal, not a separate page).
categoriesRouter.get('/:id/subcategories', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('sub_categories')
      .select('id, name, sort_order')
      .eq('category_id', req.params.id)
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
});

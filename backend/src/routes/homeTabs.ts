// Home screen's own top category-tab row (apps/customer/src/screens/home/
// components/CategoryTabs.tsx) and each tab's tile grid — real rows a
// founder manages via admin's own "Home Categories" screen
// (apps/admin/src/app/(dashboard)/home-categories), deliberately separate
// from categories/category_sections/sub_categories (the main Categories
// browse screen's own tables) so editing one can never affect the other.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const homeTabsRouter = Router();

homeTabsRouter.get('/', async (req, res, next) => {
  try {
    const { data: tabs, error: tabsError } = await supabase
      .from('home_tabs')
      .select('id, name, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (tabsError) throw tabsError;

    const { data: tiles, error: tilesError } = await supabase
      .from('home_tab_tiles')
      .select('id, home_tab_id, name, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (tilesError) throw tilesError;

    const grouped = tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      image_url: tab.image_url,
      tiles: tiles.filter((t) => t.home_tab_id === tab.id).map((t) => ({ id: t.id, name: t.name, image_url: t.image_url })),
    }));

    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

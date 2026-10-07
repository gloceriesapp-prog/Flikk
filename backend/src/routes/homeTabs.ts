// Home screen's own top category-tab row (apps/customer/src/screens/home/
// components/CategoryTabs.tsx) and each tab's tile grid + banners — real
// rows a founder manages via admin's own "Home Categories" screen
// (apps/admin/src/app/(dashboard)/home-categories), deliberately separate
// from categories/category_sections/sub_categories (the main Categories
// browse screen's own tables) so editing one can never affect the other.
// Banners (home_tab_banners) are the "ads and poster for different
// category" ask — cascades with its parent tab same as tiles. Image only,
// no badge/heading/subheading text — those columns exist but are unused
// dead columns now, per an explicit ask to drop the text entirely.
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
      .select('id, home_tab_id, name, image_url, sort_order, link_type, link_id')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (tilesError) throw tilesError;

    const { data: banners, error: bannersError } = await supabase
      .from('home_tab_banners')
      .select('id, home_tab_id, image_url, sort_order')
      .eq('is_active', true)
      .order('sort_order');
    if (bannersError) throw bannersError;

    // Tile links (migration 097): a subcategory resolves to its parent
    // category so the client can open CategoryDetail. One bounded lookup.
    const subIds = [...new Set(tiles.filter((t) => t.link_type === 'subcategory' && t.link_id).map((t) => t.link_id as string))];
    const parentBySub = new Map<string, string>();
    if (subIds.length) {
      const { data: subs, error: subsError } = await supabase.from('sub_categories').select('id, category_id').in('id', subIds).eq('is_active', true);
      if (subsError) throw subsError;
      for (const sub of subs ?? []) parentBySub.set(sub.id, sub.category_id);
    }
    const tileLink = (t: { link_type: string | null; link_id: string | null }) => {
      if (!t.link_id) return null;
      if (t.link_type === 'category') return { type: 'category', id: t.link_id, category_id: t.link_id };
      const parent = parentBySub.get(t.link_id);
      return t.link_type === 'subcategory' && parent ? { type: 'subcategory', id: t.link_id, category_id: parent } : null;
    };

    const grouped = tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      image_url: tab.image_url,
      tiles: tiles.filter((t) => t.home_tab_id === tab.id).map((t) => ({ id: t.id, name: t.name, image_url: t.image_url, link: tileLink(t) })),
      banners: banners.filter((b) => b.home_tab_id === tab.id).map((b) => ({ id: b.id, image_url: b.image_url })),
    }));

    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

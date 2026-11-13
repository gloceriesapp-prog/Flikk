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
import { resolveQuickDestination } from '../lib/quickCategoryDestination.js';
import { supabase } from '../db/supabase.js';

export const homeTabsRouter = Router();

homeTabsRouter.get('/', async (req, res, next) => {
  try {
    const { data: tabs, error: tabsError } = await supabase
      .from('home_tabs')
      .select('id, name, image_url, sort_order, section_id, quick_destination_type, show_in_quick_categories, quick_sort_order, quick_category_id, quick_subcategory_id')
      .eq('is_active', true)
      .order('sort_order')
      .order('name');
    if (tabsError) throw tabsError;

    // A tab linked to a Categories-page section (migration 20261104140000)
    // also shows that section's categories as tiles, after its own tiles.
    const sectionIds = [...new Set(tabs.map((tab) => tab.section_id).filter((id): id is string => Boolean(id)))];
    const { data: sectionCategories, error: sectionError } = sectionIds.length
      ? await supabase.from('categories').select('id, name, image_url, section_id')
        .in('section_id', sectionIds).eq('is_active', true).order('sort_order').order('name')
      : { data: [] as { id: string; name: string; image_url: string | null; section_id: string }[], error: null };
    if (sectionError) throw sectionError;

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

    const tabTiles = (tab: { id: string; section_id: string | null }) => {
      const own = tiles.filter((t) => t.home_tab_id === tab.id).map((t) => ({ id: t.id, name: t.name, image_url: t.image_url, link: tileLink(t) }));
      const linked = new Set(own.filter((t) => t.link?.type === 'category').map((t) => t.link!.id));
      const fromSection = (sectionCategories ?? [])
        .filter((c) => tab.section_id && c.section_id === tab.section_id && !linked.has(c.id))
        .map((c) => ({ id: `category:${c.id}`, name: c.name, image_url: c.image_url, link: { type: 'category', id: c.id, category_id: c.id } }));
      return [...own, ...fromSection];
    };

    // Resolve shortcut targets against active taxonomy only, in bounded batches.
    const quickSubIds = [...new Set(tabs.flatMap(tab => tab.quick_subcategory_id ? [tab.quick_subcategory_id] : []))];
    const quickParents = new Map<string, string>();
    if (quickSubIds.length) {
      const { data, error } = await supabase.from('sub_categories').select('id, category_id').in('id', quickSubIds).eq('is_active', true);
      if (error) throw error;
      for (const sub of data ?? []) quickParents.set(sub.id, sub.category_id);
    }
    const quickCategoryIds = [...new Set([...tabs.flatMap(tab => tab.quick_category_id ? [tab.quick_category_id] : []), ...quickParents.values()])];
    const activeQuickCategories = new Set<string>();
    if (quickCategoryIds.length) {
      const { data, error } = await supabase.from('categories').select('id').in('id', quickCategoryIds).eq('is_active', true);
      if (error) throw error;
      for (const category of data ?? []) activeQuickCategories.add(category.id);
    }

    const grouped = tabs.map((tab) => ({
      id: tab.id,
      name: tab.name,
      image_url: tab.image_url,
      quick_category: {
        visible: tab.show_in_quick_categories ?? null,
        order: tab.quick_sort_order ?? null,
        ...resolveQuickDestination(tab, activeQuickCategories, quickParents),
      },
      tiles: tabTiles(tab),
      banners: banners.filter((b) => b.home_tab_id === tab.id).map((b) => ({ id: b.id, image_url: b.image_url })),
    }));

    res.json(grouped);
  } catch (err) {
    next(err);
  }
});

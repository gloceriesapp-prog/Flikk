// GET /home/festival-section — Home's "All" tab FestivalPicksSection.tsx,
// real data now (migration 018_festival_section.sql). Same
// PRODUCT_WITH_VARIANTS_SELECT shape routes/stores.ts's own product feeds
// use (deals/catalog/similar) — apps/customer's mapApiProduct (api/products.ts)
// already knows how to turn this exact row shape into its Product type,
// no separate mapping needed here.
//
// Admin curates this via its own Next.js API routes (apps/admin/src/app/api/
// festival-section/*, service-role Supabase writes) — this route is
// read-only, same public/cached convention as /home-tabs.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const homeFestivalSectionRouter = Router();

const PRODUCT_WITH_VARIANTS_SELECT =
  '*, stores!inner(name, is_active, fssai_number, address_line, city, district, photo_url), product_variants(*)';

homeFestivalSectionRouter.get('/', async (_req, res, next) => {
  try {
    const { data: section, error: sectionError } = await supabase
      .from('festival_sections')
      .select('id, title')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (sectionError) throw sectionError;
    if (!section) {
      res.json(null);
      return;
    }

    const { data: links, error: linksError } = await supabase
      .from('festival_section_products')
      .select(`sort_order, products!inner(${PRODUCT_WITH_VARIANTS_SELECT})`)
      .eq('festival_section_id', section.id)
      .eq('products.approval_status', 'approved')
      .eq('products.stores.is_active', true)
      .order('sort_order');
    if (linksError) throw linksError;

    res.json({
      title: section.title,
      products: (links ?? []).map((link) => link.products),
    });
  } catch (err) {
    next(err);
  }
});

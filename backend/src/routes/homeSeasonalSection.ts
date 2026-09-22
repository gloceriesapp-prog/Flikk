// GET /home/seasonal-section — Home's "All" tab SeasonalSection.tsx, real
// data now (migration 040_seasonal_section.sql). Previously a fully
// hardcoded poster+tile grid (apps/customer's own seasonal/data.ts) with
// zero admin control. Admin curates this via its own Next.js API routes
// (apps/admin/src/app/api/seasonal-section/*, service-role writes) — this
// route is read-only, same public/cached convention as /home-tabs and
// /home/festival-section.
//
// bannerImageUrl is null (and is_active false) until an admin sets one —
// the client renders nothing for the banner in that case, same
// "no active row = section off" convention festival-section already uses
// for its own null-response case. Tiles are independent of the banner:
// a banner-off, tiles-on state (or vice versa) is real and valid.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const homeSeasonalSectionRouter = Router();

homeSeasonalSectionRouter.get('/', async (_req, res, next) => {
  try {
    const [bannerRes, tilesRes] = await Promise.all([
      supabase.from('seasonal_banner').select('banner_image_url, is_active').eq('is_active', true).maybeSingle(),
      supabase.from('seasonal_tiles').select('id, title, image_url, bg_color').eq('is_active', true).order('sort_order').limit(4),
    ]);
    if (bannerRes.error) throw bannerRes.error;
    if (tilesRes.error) throw tilesRes.error;

    res.json({
      bannerImageUrl: bannerRes.data?.banner_image_url ?? null,
      tiles: (tilesRes.data ?? []).map((t) => ({ id: t.id, title: t.title, imageUrl: t.image_url, bgColor: t.bg_color })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /home/sections — admin-controllable Home layout config (apps/customer).
// Read-only, public/cached — same convention as /home/festival-greeting. Admin
// curates rows via its own Next.js service-role API route; this only reads.
//
// Returns EVERY row (including disabled ones): the customer renderer hides
// disabled sections client-side, so it must be able to read the enabled flag.
// Ordered by sort_index so the client can render straight down the list.
// A scheduled section (starts_at / ends_at) reads as disabled outside its
// window, so the app never needs to know the clock rules. custom marks a
// founder-made product section; pinnedOnly a rail that shows only its picks
// (GET /browse/home-picks).
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const homeSectionsRouter = Router();

export function sectionLive(row: { enabled: boolean; starts_at?: string | null; ends_at?: string | null }, now = Date.now()) {
  if (!row.enabled) return false;
  if (row.starts_at && Date.parse(row.starts_at) > now) return false;
  return !(row.ends_at && Date.parse(row.ends_at) <= now);
}

homeSectionsRouter.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('home_sections')
      .select('key, title, subtitle, enabled, sort_index, bg_color, is_custom, pinned_only, starts_at, ends_at')
      .order('sort_index', { ascending: true });
    if (error) throw error;

    res.json(
      (data ?? []).map((row) => ({
        key: row.key,
        title: row.title ?? null,
        subtitle: row.subtitle ?? null,
        enabled: sectionLive(row),
        sortIndex: row.sort_index,
        bgColor: row.bg_color ?? null,
        custom: row.is_custom === true,
        pinnedOnly: row.pinned_only === true,
      })),
    );
  } catch (err) {
    next(err);
  }
});

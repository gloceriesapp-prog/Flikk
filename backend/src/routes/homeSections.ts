// GET /home/sections — admin-controllable Home layout config (apps/customer).
// Read-only, public/cached — same convention as /home/festival-greeting. Admin
// curates rows via its own Next.js service-role API route; this only reads.
//
// Returns EVERY row (including disabled ones): the customer renderer hides
// disabled sections client-side, so it must be able to read the enabled flag.
// Ordered by sort_index so the client can render straight down the list.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const homeSectionsRouter = Router();

homeSectionsRouter.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('home_sections')
      .select('key, title, subtitle, enabled, sort_index, bg_color')
      .order('sort_index', { ascending: true });
    if (error) throw error;

    res.json(
      (data ?? []).map((row) => ({
        key: row.key,
        title: row.title ?? null,
        subtitle: row.subtitle ?? null,
        enabled: row.enabled,
        sortIndex: row.sort_index,
        bgColor: row.bg_color ?? null,
      })),
    );
  } catch (err) {
    next(err);
  }
});

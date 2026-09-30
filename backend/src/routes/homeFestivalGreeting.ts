// GET /home/festival-greeting — Home's editable festival greeting panel
// (apps/customer). Read-only, public/cached — same convention as
// /home/festival-section. Admin curates this via its own Next.js API routes
// (service-role Supabase writes); this route only reads the single row.
//
// Read always succeeds even when is_active=false: the client hides the panel
// itself based on the flag, so it must be able to read the flag.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const homeFestivalGreetingRouter = Router();

homeFestivalGreetingRouter.get('/', async (_req, res, next) => {
  try {
    const { data: row, error } = await supabase
      .from('festival_greeting')
      .select('is_active, title, tagline, categories')
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    res.json({
      isActive: row?.is_active ?? true,
      title: row?.title ?? 'Happy Navratri',
      tagline: row?.tagline ?? 'Celebrate the season with fresh picks',
      categories: row?.categories ?? [],
    });
  } catch (err) {
    next(err);
  }
});

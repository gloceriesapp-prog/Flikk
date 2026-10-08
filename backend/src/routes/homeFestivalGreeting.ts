// GET /home/festival-greeting — Home's editable festival greeting panel and
// the festival tab (apps/customer). Read-only, public/cached — same
// convention as /home/festival-section. Admin curates this via its own
// Next.js API routes (service-role Supabase writes); this route only reads
// the single row.
//
// Read always succeeds even when is_active=false: the client hides the panel
// itself based on the flag, so it must be able to read the flag. The festival
// tab (migration 112) is OFF unless the row turns it on: no row, or an older
// row without the tab columns, means no festival tab.
import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export interface FestivalGreetingRow {
  is_active?: boolean | null;
  title?: string | null;
  tagline?: string | null;
  categories?: unknown;
  tab_enabled?: boolean | null;
  tab_title?: string | null;
  tab_background_color?: string | null;
  tab_header_color?: string | null;
  tab_header_image_url?: string | null;
  tab_banner_image_url?: string | null;
}

const HEX = /^#[0-9a-f]{6}$/i;
const color = (value: unknown, fallback: string) => (typeof value === 'string' && HEX.test(value) ? value : fallback);
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

function categories(value: unknown): { id: string; title: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((c): c is { id: unknown; title: unknown } => typeof c === 'object' && c !== null)
    .map((c) => ({ id: String(c.id ?? ''), title: String(c.title ?? '') }))
    .filter((c) => c.id && c.title.trim());
}

export function toFestivalGreeting(row: FestivalGreetingRow | null) {
  return {
    isActive: row?.is_active ?? true,
    title: row?.title ?? 'Happy Navratri',
    tagline: row?.tagline ?? 'Celebrate the season with fresh picks',
    categories: categories(row?.categories),
    tab: {
      enabled: row?.tab_enabled === true,
      title: text(row?.tab_title) ?? 'Navratri',
      backgroundColor: color(row?.tab_background_color, '#FFF1D6'),
      headerColor: color(row?.tab_header_color, '#F6C667'),
      // Storage path or https URL; the app resolves paths to media URLs.
      headerImageUrl: text(row?.tab_header_image_url),
      bannerImageUrl: text(row?.tab_banner_image_url),
    },
  };
}

export const homeFestivalGreetingRouter = Router();

homeFestivalGreetingRouter.get('/', async (_req, res, next) => {
  try {
    const { data: row, error } = await supabase
      .from('festival_greeting')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json(toFestivalGreeting(row as FestivalGreetingRow | null));
  } catch (err) {
    next(err);
  }
});

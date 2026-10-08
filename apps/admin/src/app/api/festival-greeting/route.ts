// Server-side read/write for the single festival_greeting row — the
// admin-curated greeting banner (title + tagline + up to a few category
// chips) and the customer Home festival tab (switch, title, colours,
// artwork; migration 112) the customer app reads. Same "guaranteed
// singleton, no [id] sub-route" shape as app/api/platform-settings/route.ts,
// service_role client.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdminSession } from '@/lib/supabase/server';

interface GreetingCategory {
  id: string;
  title: string;
}

interface FestivalGreetingRow {
  id: string;
  is_active: boolean;
  title: string | null;
  tagline: string | null;
  categories: GreetingCategory[] | null;
  tab_enabled: boolean;
  tab_title: string;
  tab_background_color: string;
  tab_header_color: string;
  tab_header_image_url: string | null;
  tab_banner_image_url: string | null;
}

const SELECT = 'id, is_active, title, tagline, categories, tab_enabled, tab_title, tab_background_color, tab_header_color, tab_header_image_url, tab_banner_image_url';
const HEX = /^#[0-9a-f]{6}$/i;

function coerceCategories(input: unknown): GreetingCategory[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map((c) => ({ id: String(c.id ?? ''), title: String(c.title ?? '') }));
}

// Storage path (e.g. Images/diwali.png) or https URL; blank clears it.
function artwork(value: unknown, label: string): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 1000) throw new Error(`${label} is too long.`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https:\/\//i.test(trimmed)) throw new Error(`${label} must be an https:// URL or a storage path.`);
  return trimmed;
}

export async function GET() {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const { data, error } = await supabaseAdmin.from('festival_greeting').select(SELECT).limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json(data ?? null);
  } catch {
    return NextResponse.json({ error: 'Could not load the festival greeting.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdminSession())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await request.json();
    const tabTitle = typeof body.tab_title === 'string' ? body.tab_title.trim() : '';
    if (tabTitle.length < 1 || tabTitle.length > 30) throw new Error('Tab title must be 1 to 30 characters.');
    for (const [field, label] of [['tab_background_color', 'Tab background colour'], ['tab_header_color', 'Tab header colour']] as const) {
      if (typeof body[field] !== 'string' || !HEX.test(body[field])) throw new Error(`${label} must be a hex colour like #FFF1D6.`);
    }
    const payload = {
      title: typeof body.title === 'string' ? body.title : '',
      tagline: typeof body.tagline === 'string' ? body.tagline : '',
      is_active: Boolean(body.is_active),
      categories: coerceCategories(body.categories),
      tab_enabled: body.tab_enabled === true,
      tab_title: tabTitle,
      tab_background_color: (body.tab_background_color as string).toUpperCase(),
      tab_header_color: (body.tab_header_color as string).toUpperCase(),
      tab_header_image_url: artwork(body.tab_header_image_url, 'Tab header image'),
      tab_banner_image_url: artwork(body.tab_banner_image_url, 'Festival banner image'),
      updated_at: new Date().toISOString(),
    };

    // Singleton: update the existing row by id, or insert if none exists yet.
    const { data: existing, error: readErr } = await supabaseAdmin.from('festival_greeting').select('id').limit(1).maybeSingle();
    if (readErr) throw readErr;

    const query = existing
      ? supabaseAdmin.from('festival_greeting').update(payload).eq('id', (existing as { id: string }).id)
      : supabaseAdmin.from('festival_greeting').insert(payload);

    const { data, error } = await query.select(SELECT).single();
    if (error) throw error;

    return NextResponse.json(data as unknown as FestivalGreetingRow);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the festival greeting.' }, { status: 400 });
  }
}

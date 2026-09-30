// Server-side read/write for the single festival_greeting row — the
// admin-curated greeting banner (title + tagline + up to a few category
// chips) the customer app reads. Same "guaranteed singleton, no [id]
// sub-route" shape as app/api/platform-settings/route.ts, service_role
// client, auto-auth via middleware.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
}

const SELECT = 'id, is_active, title, tagline, categories';

function coerceCategories(input: unknown): GreetingCategory[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null)
    .map((c) => ({ id: String(c.id ?? ''), title: String(c.title ?? '') }));
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.from('festival_greeting').select(SELECT).limit(1).maybeSingle();
    if (error) throw error;
    return NextResponse.json(data ?? null);
  } catch {
    return NextResponse.json({ error: 'Could not load the festival greeting.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json();

  try {
    const payload = {
      title: typeof body.title === 'string' ? body.title : '',
      tagline: typeof body.tagline === 'string' ? body.tagline : '',
      is_active: Boolean(body.is_active),
      categories: coerceCategories(body.categories),
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

// Server-side read/write for the home_sections layout config (migration 058)
// — the customer Home "All" tab's admin-controllable sections. Service-role
// client, auto-auth via middleware. GET lists every section ordered by
// sort_index; PUT takes the full list back and upserts it by `key` (reorder =
// rewrite sort_index for each row).
//
// We upsert on the natural key `key` rather than id so the admin UI never has
// to carry row ids around; a section the UI doesn't send is left untouched
// (we don't delete — code owns which keys exist; admin only tweaks them).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

interface HomeSectionRow {
  key: string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sort_index: number;
  bg_color: string | null;
}

const SELECT = 'key, title, subtitle, enabled, sort_index, bg_color';

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const { data, error } = await supabaseAdmin.from('home_sections').select(SELECT).order('sort_index', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json({ error: 'Could not load the home sections.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json();
  const list: unknown[] = Array.isArray(body?.sections) ? body.sections : [];

  try {
    // Reindex from the incoming order (0,10,20…) so a drag-reorder in the UI
    // becomes the new sort_index regardless of what the client sent.
    const rows: HomeSectionRow[] = list
      .filter(
        (r): r is Record<string, unknown> =>
          typeof r === 'object' && r !== null && typeof (r as Record<string, unknown>).key === 'string',
      )
      .map((r, i) => ({
        key: String(r.key),
        title: clean(r.title),
        subtitle: clean(r.subtitle),
        enabled: Boolean(r.enabled),
        sort_index: i * 10,
        bg_color: clean(r.bg_color),
      }));

    if (rows.length === 0) return NextResponse.json({ error: 'No sections to save.' }, { status: 400 });

    const { data, error } = await supabaseAdmin.from('home_sections').upsert(rows, { onConflict: 'key' }).select(SELECT);
    if (error) throw error;

    return NextResponse.json((data ?? []).sort((a, b) => (a.sort_index as number) - (b.sort_index as number)));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the home sections.' }, { status: 400 });
  }
}

// Server-side read/write for the home_sections layout config (migration 058)
// — the customer Home "All" tab's admin-controllable sections. Service-role
// client, auto-auth via middleware. GET lists every section ordered by
// sort_index with its hand-picked product ids; PUT takes the full list back
// and upserts it by `key` (reorder = rewrite sort_index for each row).
//
// We upsert on the natural key `key` rather than id so the admin UI never has
// to carry row ids around; a section the UI doesn't send is left untouched.
// Built-in keys belong to code; only founder-made sections (custom-xxxxxx,
// migration 20261027150000) are created (POST) and deleted (DELETE) here.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isCustomSection, newCustomSectionKey, scheduleToIso } from '@/lib/homeSectionPins';

interface HomeSectionRow {
  key: string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sort_index: number;
  bg_color: string | null;
  is_custom?: boolean;
  pinned_only: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

const SELECT = 'key, title, subtitle, enabled, sort_index, bg_color, is_custom, pinned_only, starts_at, ends_at';

function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function listSections() {
  const [{ data, error }, { data: pins, error: pinsError }] = await Promise.all([
    supabaseAdmin.from('home_sections').select(SELECT).order('sort_index', { ascending: true }),
    supabaseAdmin.from('home_section_products').select('section_key, product_id, position').order('position', { ascending: true }),
  ]);
  if (error || pinsError) throw error ?? pinsError;
  const byKey = new Map<string, string[]>();
  for (const pin of pins ?? []) byKey.set(pin.section_key, [...(byKey.get(pin.section_key) ?? []), pin.product_id]);
  return (data ?? []).map((row) => ({ ...row, product_ids: byKey.get(row.key) ?? [] }));
}

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json(await listSections());
  } catch {
    return NextResponse.json({ error: 'Could not load the home sections.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const list: unknown[] = Array.isArray(body?.sections) ? body.sections : [];

  try {
    // Reindex from the incoming order (0,10,20…) so a drag-reorder in the UI
    // becomes the new sort_index regardless of what the client sent.
    const rows: HomeSectionRow[] = list
      .filter(
        (r): r is Record<string, unknown> =>
          typeof r === 'object' && r !== null && typeof (r as Record<string, unknown>).key === 'string',
      )
      .map((r, i) => {
        const key = String(r.key);
        const title = clean(r.title);
        if (isCustomSection(key) && !title) throw new Error('Give every new section a title.');
        return {
          key,
          title,
          subtitle: clean(r.subtitle),
          enabled: Boolean(r.enabled),
          sort_index: i * 10,
          bg_color: clean(r.bg_color),
          // Sent so the upsert's insert half satisfies home_sections_custom_key_check.
          is_custom: isCustomSection(key),
          pinned_only: Boolean(r.pinned_only),
          starts_at: scheduleToIso(r.starts_at),
          ends_at: scheduleToIso(r.ends_at),
        };
      });

    if (rows.length === 0) return NextResponse.json({ error: 'No sections to save.' }, { status: 400 });
    for (const row of rows) {
      if (row.starts_at && row.ends_at && row.ends_at <= row.starts_at) throw new Error('A section must end after it starts.');
    }

    const { error } = await supabaseAdmin.from('home_sections').upsert(rows, { onConflict: 'key' });
    if (error) throw error;

    return NextResponse.json(await listSections());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the home sections.' }, { status: 400 });
  }
}

// New founder-made product section, added at the end and hidden until it
// has products and is switched on.
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const title = clean(body?.title);
  if (!title || title.length > 60) return NextResponse.json({ error: 'Give the section a title (up to 60 characters).' }, { status: 400 });
  try {
    const { data: last, error: lastError } = await supabaseAdmin.from('home_sections').select('sort_index')
      .order('sort_index', { ascending: false }).limit(1).maybeSingle();
    if (lastError) throw lastError;
    const { error } = await supabaseAdmin.from('home_sections').insert({
      key: newCustomSectionKey(), title, enabled: false, is_custom: true, sort_index: (last?.sort_index ?? 0) + 10,
    });
    if (error) throw error;
    return NextResponse.json(await listSections(), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Could not add the section.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const key = new URL(request.url).searchParams.get('key') ?? '';
  if (!isCustomSection(key)) return NextResponse.json({ error: 'Only sections you created can be deleted.' }, { status: 400 });
  try {
    const { error } = await supabaseAdmin.from('home_sections').delete().eq('key', key).eq('is_custom', true);
    if (error) throw error;
    return NextResponse.json(await listSections());
  } catch {
    return NextResponse.json({ error: 'Could not delete the section.' }, { status: 500 });
  }
}

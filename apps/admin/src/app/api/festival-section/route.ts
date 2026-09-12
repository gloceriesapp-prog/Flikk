// The Festival Section screen's data — one row read/written here (GET the
// current section + its picked products for the editor, PUT to create-or-
// update the title/active flag). Service-role client — festival_sections
// has no public write policy (same rationale as every other write route
// here: no admin login session for RLS to check against, see
// lib/supabase/admin.ts's own note). Reads use it too since the editor
// needs to see a DRAFT (is_active = false) section too, which the public
// festival_sections_read_active RLS policy would hide.
//
// Deliberately a singleton, not a list — see migrations/018_festival_section.sql's
// own note: one row is all this needs at MVP scale (single zone, one live
// festival at a time), `is_active` just lets a founder prep the next one
// ahead of time.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const { data: section, error: sectionError } = await supabaseAdmin
      .from('festival_sections')
      .select('id, title, is_active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sectionError) throw sectionError;
    if (!section) return NextResponse.json(null);

    const { data: links, error: linksError } = await supabaseAdmin
      .from('festival_section_products')
      .select('id, sort_order, products(id, name, price, unit, image_url)')
      .eq('festival_section_id', section.id)
      .order('sort_order');
    if (linksError) throw linksError;

    return NextResponse.json({ ...section, products: links ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load the festival section.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as { id?: string; title: string; is_active: boolean };
    if (!body.title.trim()) throw new Error('Title is required.');

    const { data, error } = body.id
      ? await supabaseAdmin.from('festival_sections').update({ title: body.title, is_active: body.is_active }).eq('id', body.id).select().single()
      : await supabaseAdmin.from('festival_sections').insert({ title: body.title, is_active: body.is_active }).select().single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save the festival section.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

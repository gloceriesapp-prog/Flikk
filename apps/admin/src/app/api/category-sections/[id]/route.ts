// Rename or delete one category-section title — same service_role rationale
// as app/api/category-sections/route.ts's own note. Categories under a
// deleted title aren't deleted with it — categories.section_id has on delete
// set null (see the migration), so they just become untitled until
// re-assigned rather than silently disappearing along with the title.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { cleanSectionName } from '@/lib/categorySectionName';
import { CATEGORY_SECTION_SELECT, mapRowToCategorySection, type CategorySectionRow } from '@/lib/supabase/categorySections';

export async function PATCH(request: Request, ctx: RouteContext<'/api/category-sections/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body: { name?: unknown } = await request.json().catch(() => ({}));

  try {
    const { data: existing, error: listError } = await supabaseAdmin.from('category_sections').select('id, name');
    if (listError) throw listError;
    if (!existing?.some((s) => s.id === id)) {
      return NextResponse.json({ error: 'That title no longer exists.' }, { status: 404 });
    }
    const name = cleanSectionName(body.name, existing, id);
    const { data, error } = await supabaseAdmin
      .from('category_sections')
      .update({ name })
      .eq('id', id)
      .select(CATEGORY_SECTION_SELECT)
      .single();
    if (error) throw error;
    return NextResponse.json(mapRowToCategorySection(data as unknown as CategorySectionRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not rename title.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/category-sections/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    const { error } = await supabaseAdmin.from('category_sections').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete title.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

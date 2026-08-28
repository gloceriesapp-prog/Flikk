// Server-side update/delete for one Home tab — same service_role rationale
// as app/api/home-tabs/route.ts's own note. Deleting a tab cascades to its
// tiles (home_tab_tiles.home_tab_id is ON DELETE CASCADE, see the
// migration) — a tile with no parent tab has nowhere to render, unlike
// categories/sub_categories where a sub-category outlives its deleted
// title (on delete set null there, deliberately different here).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { HOME_TAB_SELECT, mapRowToHomeTab, type HomeTabRow } from '@/lib/supabase/homeTabs';
import { toHomeTabErrorMessage, toHomeTabRow, validateHomeTabInput, type HomeTabWriteInput } from '@/lib/homeTabValidation';

export async function PATCH(request: Request, ctx: RouteContext<'/api/home-tabs/[id]'>) {
  const { id } = await ctx.params;
  const body = await request.json();

  try {
    const input: Partial<HomeTabWriteInput> = body;
    validateHomeTabInput(input);

    const { data, error } = await supabaseAdmin
      .from('home_tabs')
      .update(toHomeTabRow(input))
      .eq('id', id)
      .select(HOME_TAB_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToHomeTab(data as unknown as HomeTabRow));
  } catch (err) {
    return NextResponse.json({ error: toHomeTabErrorMessage(err, 'Could not save changes.') }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/home-tabs/[id]'>) {
  const { id } = await ctx.params;

  try {
    const { error } = await supabaseAdmin.from('home_tabs').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toHomeTabErrorMessage(err, 'Could not delete tab.') }, { status: 400 });
  }
}

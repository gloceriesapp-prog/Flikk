// Server-side rename/delete for one sub-category — same service_role
// rationale as app/api/subcategories/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SUB_CATEGORY_SELECT, mapRowToSubCategory, type SubCategoryRow } from '@/lib/supabase/subcategories';

export async function PATCH(request: Request, ctx: RouteContext<'/api/subcategories/[id]'>) {
  const { id } = await ctx.params;
  const body: { name?: string; imageUrl?: string | null } = await request.json();

  try {
    if (!body.name || !body.name.trim()) throw new Error('Sub-category name is required.');

    const { data, error } = await supabaseAdmin
      .from('sub_categories')
      .update({ name: body.name.trim(), image_url: body.imageUrl?.trim() || null })
      .eq('id', id)
      .select(SUB_CATEGORY_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToSubCategory(data as unknown as SubCategoryRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save changes.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/subcategories/[id]'>) {
  const { id } = await ctx.params;

  try {
    const { error } = await supabaseAdmin.from('sub_categories').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete sub-category.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

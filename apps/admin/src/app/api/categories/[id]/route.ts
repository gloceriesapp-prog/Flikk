// Server-side update/delete for one category — same service_role rationale
// as app/api/categories/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CATEGORY_SELECT, mapRowToCategory, type CategoryRow } from '@/lib/supabase/categories';
import { toCategoryErrorMessage, toCategoryRow, validateCategoryInput, type CategoryWriteInput } from '@/lib/categoryValidation';

export async function PATCH(request: Request, ctx: RouteContext<'/api/categories/[id]'>) {
  const { id } = await ctx.params;
  const body = await request.json();

  try {
    const input: Partial<CategoryWriteInput> = body;
    validateCategoryInput(input);

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(toCategoryRow(input))
      .eq('id', id)
      .select(CATEGORY_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToCategory(data as unknown as CategoryRow));
  } catch (err) {
    return NextResponse.json({ error: toCategoryErrorMessage(err, 'Could not save changes.') }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/categories/[id]'>) {
  const { id } = await ctx.params;

  try {
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete category.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// Server-side insert for a new sub-category — service_role client, same
// rationale as app/api/categories/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SUB_CATEGORY_SELECT, mapRowToSubCategory, type SubCategoryRow } from '@/lib/supabase/subcategories';
import { toSubCategoryRow, validateSubCategoryInput, type SubCategoryWriteInput } from '@/lib/subcategoryValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json();

  try {
    const input: Partial<SubCategoryWriteInput> = body;
    validateSubCategoryInput(input);

    const { data, error } = await supabaseAdmin
      .from('sub_categories')
      .insert(toSubCategoryRow(input))
      .select(SUB_CATEGORY_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToSubCategory(data as unknown as SubCategoryRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add sub-category.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

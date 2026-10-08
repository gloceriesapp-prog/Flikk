// Server-side insert for a new category — service_role client, same
// rationale as app/api/products/route.ts's own note (categories_read_active
// RLS is read-only public; there's no write policy for the anon key at all,
// same "admin has no login flow yet" gap every other admin write works
// around this way).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CATEGORY_SELECT, mapRowToCategory, type CategoryRow } from '@/lib/supabase/categories';
import { toCategoryErrorMessage, toCategoryRow, validateCategoryInput, type CategoryWriteInput } from '@/lib/categoryValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body = await request.json();

  try {
    const input: Partial<CategoryWriteInput> = body;
    validateCategoryInput(input);

    const { data, error } = await supabaseAdmin.from('categories').insert(toCategoryRow(input)).select(CATEGORY_SELECT).single();
    if (error) throw error;

    return NextResponse.json(mapRowToCategory(data as unknown as CategoryRow));
  } catch (err) {
    return NextResponse.json({ error: toCategoryErrorMessage(err, 'Could not add category.') }, { status: 400 });
  }
}

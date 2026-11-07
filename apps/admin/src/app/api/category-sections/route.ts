// Server-side insert for a new category-section title — service_role
// client, same rationale as app/api/categories/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CATEGORY_SECTION_SELECT, mapRowToCategorySection, type CategorySectionRow } from '@/lib/supabase/categorySections';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { cleanSectionName } from '@/lib/categorySectionName';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const body: { name?: string; sortOrder?: number } = await request.json();

  try {
    const { data: existing, error: listError } = await supabaseAdmin.from('category_sections').select('id, name');
    if (listError) throw listError;
    const name = cleanSectionName(body.name, existing ?? []);

    const { data, error } = await supabaseAdmin
      .from('category_sections')
      .insert({ name, sort_order: body.sortOrder ?? 0 })
      .select(CATEGORY_SECTION_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToCategorySection(data as unknown as CategorySectionRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add title.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

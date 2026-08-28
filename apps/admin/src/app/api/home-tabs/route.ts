// Server-side insert for a new Home tab — service_role client, same
// rationale as app/api/categories/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { HOME_TAB_SELECT, mapRowToHomeTab, type HomeTabRow } from '@/lib/supabase/homeTabs';
import { toHomeTabErrorMessage, toHomeTabRow, validateHomeTabInput, type HomeTabWriteInput } from '@/lib/homeTabValidation';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const input: Partial<HomeTabWriteInput> = body;
    validateHomeTabInput(input);

    const { data, error } = await supabaseAdmin.from('home_tabs').insert(toHomeTabRow(input)).select(HOME_TAB_SELECT).single();
    if (error) throw error;

    return NextResponse.json(mapRowToHomeTab(data as unknown as HomeTabRow));
  } catch (err) {
    return NextResponse.json({ error: toHomeTabErrorMessage(err, 'Could not add tab.') }, { status: 400 });
  }
}

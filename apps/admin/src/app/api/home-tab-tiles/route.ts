// Server-side insert for a new Home-tab tile — service_role client, same
// rationale as app/api/home-tabs/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { HOME_TAB_TILE_SELECT, mapRowToHomeTabTile, type HomeTabTileRow } from '@/lib/supabase/homeTabs';
import {
  toHomeTabErrorMessage,
  toHomeTabTileRow,
  validateHomeTabTileInput,
  type HomeTabTileWriteInput,
} from '@/lib/homeTabValidation';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const input: Partial<HomeTabTileWriteInput> = body;
    validateHomeTabTileInput(input);

    const { data, error } = await supabaseAdmin
      .from('home_tab_tiles')
      .insert(toHomeTabTileRow(input))
      .select(HOME_TAB_TILE_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToHomeTabTile(data as unknown as HomeTabTileRow));
  } catch (err) {
    return NextResponse.json({ error: toHomeTabErrorMessage(err, 'Could not add tile.') }, { status: 400 });
  }
}

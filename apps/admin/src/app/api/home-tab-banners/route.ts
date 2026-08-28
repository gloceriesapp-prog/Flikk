// Server-side insert for a new Home-tab banner — service_role client, same
// rationale as app/api/home-tabs/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { HOME_TAB_BANNER_SELECT, mapRowToHomeTabBanner, type HomeTabBannerRow } from '@/lib/supabase/homeTabs';
import {
  toHomeTabBannerRow,
  toHomeTabErrorMessage,
  validateHomeTabBannerInput,
  type HomeTabBannerWriteInput,
} from '@/lib/homeTabValidation';

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const input: Partial<HomeTabBannerWriteInput> = body;
    validateHomeTabBannerInput(input);

    const { data, error } = await supabaseAdmin
      .from('home_tab_banners')
      .insert(toHomeTabBannerRow(input))
      .select(HOME_TAB_BANNER_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToHomeTabBanner(data as unknown as HomeTabBannerRow));
  } catch (err) {
    return NextResponse.json({ error: toHomeTabErrorMessage(err, 'Could not add banner.') }, { status: 400 });
  }
}

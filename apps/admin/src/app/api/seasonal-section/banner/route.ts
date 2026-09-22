// Update the seasonal_banner singleton — guaranteed one row (migration's
// own insert), same "no [id] sub-route" shape as app/api/delivery-settings.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(request: Request) {
  const body = await request.json();

  try {
    const { data, error } = await supabaseAdmin
      .from('seasonal_banner')
      .update({
        banner_image_url: body.bannerImageUrl || null,
        is_active: Boolean(body.isActive),
        updated_at: new Date().toISOString(),
      })
      .select('id, banner_image_url, is_active')
      .single();
    if (error) throw error;

    return NextResponse.json({ id: data.id, bannerImageUrl: data.banner_image_url, isActive: data.is_active });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the banner.' }, { status: 400 });
  }
}

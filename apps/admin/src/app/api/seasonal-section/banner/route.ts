// Update the seasonal_banner singleton — guaranteed one row (migration's
// own insert), same "no [id] sub-route" shape as app/api/delivery-settings:
// read the singleton's id, then update by that id. An unfiltered UPDATE is
// refused by PostgreSQL safe-update protection (and would touch every row).

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function PATCH(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await request.json();
    const bannerImageUrl = typeof body.bannerImageUrl === 'string' && body.bannerImageUrl.trim() ? body.bannerImageUrl.trim() : null;
    if (bannerImageUrl && !/^https:\/\//i.test(bannerImageUrl)) throw new Error('Banner image must be an https:// URL.');
    const isActive = Boolean(body.isActive);
    if (isActive && !bannerImageUrl) throw new Error('Add a banner image before turning the banner on.');

    const { data: existing, error: readError } = await supabaseAdmin
      .from('seasonal_banner').select('id').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (readError) throw readError;

    const payload = { banner_image_url: bannerImageUrl, is_active: isActive, updated_at: new Date().toISOString() };
    const { data, error } = existing
      ? await supabaseAdmin.from('seasonal_banner').update(payload).eq('id', (existing as { id: string }).id)
        .select('id, banner_image_url, is_active').single()
      : await supabaseAdmin.from('seasonal_banner').insert(payload).select('id, banner_image_url, is_active').single();
    if (error) throw error;

    return NextResponse.json({ id: data.id, bannerImageUrl: data.banner_image_url, isActive: data.is_active });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save the banner.' }, { status: 400 });
  }
}

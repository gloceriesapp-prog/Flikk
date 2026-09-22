// Server-side read/write for the customer app's Home "All" tab seasonal
// poster + tile grid (migrations/040_seasonal_section.sql) — service_role
// client, same rationale as every other admin write in this app. GET
// returns both the banner singleton and the tile list in one call since
// the admin page always needs both together.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface TileRow {
  id: string;
  title: string;
  image_url: string | null;
  bg_color: string;
  sort_order: number;
  is_active: boolean;
}

export async function GET() {
  try {
    const [bannerRes, tilesRes] = await Promise.all([
      supabaseAdmin.from('seasonal_banner').select('id, banner_image_url, is_active').single(),
      supabaseAdmin.from('seasonal_tiles').select('id, title, image_url, bg_color, sort_order, is_active').order('sort_order'),
    ]);
    if (bannerRes.error) throw bannerRes.error;
    if (tilesRes.error) throw tilesRes.error;

    return NextResponse.json({
      banner: { id: bannerRes.data.id, bannerImageUrl: bannerRes.data.banner_image_url, isActive: bannerRes.data.is_active },
      tiles: ((tilesRes.data ?? []) as TileRow[]).map((t) => ({
        id: t.id,
        title: t.title,
        imageUrl: t.image_url,
        bgColor: t.bg_color,
        sortOrder: t.sort_order,
        isActive: t.is_active,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load the seasonal section.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Creates a new tile — the banner is a guaranteed singleton (updated via
// PATCH /api/seasonal-section/banner instead), tiles are a real list a
// founder adds/removes from.
export async function POST(request: Request) {
  const body = await request.json();

  try {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new Error('A tile title is required.');

    const { data, error } = await supabaseAdmin
      .from('seasonal_tiles')
      .insert({
        title,
        image_url: body.imageUrl || null,
        bg_color: body.bgColor || '#F4F1EA',
        sort_order: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      })
      .select('id, title, image_url, bg_color, sort_order, is_active')
      .single();
    if (error) throw error;

    return NextResponse.json({
      id: data.id,
      title: data.title,
      imageUrl: data.image_url,
      bgColor: data.bg_color,
      sortOrder: data.sort_order,
      isActive: data.is_active,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not add tile.' }, { status: 400 });
  }
}

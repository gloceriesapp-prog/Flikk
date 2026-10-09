// Server-side update/delete for one Home-tab tile — same service_role
// rationale as app/api/home-tab-tiles/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { HOME_TAB_TILE_SELECT, mapRowToHomeTabTile, type HomeTabTileRow } from '@/lib/supabase/homeTabs';
import { toHomeTabErrorMessage, toHomeTabTileLink } from '@/lib/homeTabValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function PATCH(request: Request, ctx: RouteContext<'/api/home-tab-tiles/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  const body: { name?: string; imageUrl?: string | null; linkType?: string | null; linkId?: string | null } = await request.json();

  try {
    if (!body.name || !body.name.trim()) throw new Error('Tile name is required.');

    const { data, error } = await supabaseAdmin
      .from('home_tab_tiles')
      .update({
        name: body.name.trim(),
        image_url: body.imageUrl?.trim() || null,
        // Link only changes when the caller sends it, so a photo-only edit keeps it.
        ...('linkType' in body ? toHomeTabTileLink(body.linkType, body.linkId) : {}),
      })
      .eq('id', id)
      .select(HOME_TAB_TILE_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToHomeTabTile(data as unknown as HomeTabTileRow));
  } catch (err) {
    return NextResponse.json({ error: toHomeTabErrorMessage(err, 'Could not save changes.') }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/home-tab-tiles/[id]'>) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;

  try {
    const { error } = await supabaseAdmin.from('home_tab_tiles').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: toHomeTabErrorMessage(err, 'Could not delete tile.') }, { status: 400 });
  }
}

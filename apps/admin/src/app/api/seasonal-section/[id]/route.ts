// Server-side update/delete for one seasonal tile — same service_role
// rationale as app/api/seasonal-section/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(request: Request, ctx: RouteContext<'/api/seasonal-section/[id]'>) {
  const { id } = await ctx.params;
  const body = await request.json();

  try {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) throw new Error('A tile title is required.');

    const { data, error } = await supabaseAdmin
      .from('seasonal_tiles')
      .update({
        title,
        image_url: body.imageUrl || null,
        bg_color: body.bgColor || '#F4F1EA',
        sort_order: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
        is_active: Boolean(body.isActive),
      })
      .eq('id', id)
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
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not save changes.' }, { status: 400 });
  }
}

export async function DELETE(request: Request, ctx: RouteContext<'/api/seasonal-section/[id]'>) {
  const { id } = await ctx.params;

  try {
    const { error } = await supabaseAdmin.from('seasonal_tiles').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not delete tile.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

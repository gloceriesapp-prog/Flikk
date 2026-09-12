// Remove or reorder one row already on the festival shelf. `id` here is
// festival_section_products.id (the link row), not the product's own id —
// the same product could in principle be re-added after removal, so the
// link row is what this URL addresses.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { sort_order } = (await request.json()) as { sort_order: number };

    const { data, error } = await supabaseAdmin.from('festival_section_products').update({ sort_order }).eq('id', id).select().single();
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not reorder that product.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin.from('festival_section_products').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not remove that product.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

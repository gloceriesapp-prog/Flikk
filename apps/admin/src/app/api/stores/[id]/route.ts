// Server-side update for one store's operational fields — category, phone,
// hours, active/deactivated. Onboarding documents (FSSAI, PAN, bank, etc.)
// are captured once at creation and not re-editable from here — same
// service_role rationale as app/api/stores/route.ts's own note.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { STORE_SELECT, mapRowToStore, type StoreRow } from '@/lib/supabase/stores';

interface StoreUpdateInput {
  category?: string;
  phone?: string;
  openTime?: string;
  closeTime?: string;
  isActive?: boolean;
}

export async function PATCH(request: Request, ctx: RouteContext<'/api/stores/[id]'>) {
  const { id } = await ctx.params;
  const body: StoreUpdateInput = await request.json();

  try {
    const patch: Record<string, unknown> = {};
    if (body.category !== undefined) patch.category = body.category;
    if (body.phone !== undefined) patch.phone = body.phone;
    if (body.openTime !== undefined) patch.open_time = body.openTime;
    if (body.closeTime !== undefined) patch.close_time = body.closeTime;
    if (body.isActive !== undefined) patch.is_active = body.isActive;

    const { data, error } = await supabaseAdmin.from('stores').update(patch).eq('id', id).select(STORE_SELECT).single();
    if (error) throw error;

    return NextResponse.json(mapRowToStore(data as unknown as StoreRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not save changes.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

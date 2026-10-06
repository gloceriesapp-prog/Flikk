import { requireStoreAdmin } from '@/features/store-management/adminGate';
// Server-side insert for a new store — service_role client, same rationale
// as app/api/products/route.ts's own note (stores_owner_write RLS needs an
// authenticated store-owner session this dashboard doesn't have). Single
// zone at launch (CLAUDE.md), so zone_id is resolved server-side rather
// than collected from AddStoreModal — the founder never picks a zone.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { STORE_SELECT, mapRowToStore, type StoreRow } from '@/lib/supabase/stores';
import { toStoreRow, validateStoreInput, type StoreWriteInput } from '@/lib/storeValidation';

export async function POST(request: Request) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  const body = await request.json();

  try {
    const input: Partial<StoreWriteInput> = body;
    validateStoreInput(input);

    const { data: zone, error: zoneError } = await supabaseAdmin.from('zones').select('id').limit(1).single();
    if (zoneError) throw zoneError;

    const { data, error } = await supabaseAdmin
      .from('stores')
      .insert({ ...toStoreRow(input), zone_id: zone.id })
      .select(STORE_SELECT)
      .single();
    if (error) throw error;

    return NextResponse.json(mapRowToStore(data as unknown as StoreRow));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not add store.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  const { data, error } = await supabaseAdmin.from('stores').select(STORE_SELECT).order('name');
  if (error) {
    console.error('Admin stores read failed', error);
    return NextResponse.json({ error: 'Could not load stores.' }, { status: 500 });
  }
  return NextResponse.json((data as unknown as StoreRow[]).map(mapRowToStore));
}

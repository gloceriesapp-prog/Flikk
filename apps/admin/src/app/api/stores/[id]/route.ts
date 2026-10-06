import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { STORE_SELECT, mapRowToStore, type StoreRow } from '@/lib/supabase/stores';
import { parseStorePatch, StorePatchError, validateMergedStore } from '@/features/store-management/storePatch';

export async function PATCH(request: Request, ctx: RouteContext<'/api/stores/[id]'>) {
  try {
    const unauthorized = await requireStoreAdmin();
    if (unauthorized) return unauthorized;
    const { id } = await ctx.params;
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Invalid store ID.' }, { status: 400 });
    let body: unknown;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
    const patch = parseStorePatch(body);
    const { data: current, error: readError } = await supabaseAdmin.from('stores').select(STORE_SELECT).eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!current) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    validateMergedStore(current, patch);
    const { data, error } = await supabaseAdmin.from('stores').update(patch).eq('id', id).select(STORE_SELECT).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    return NextResponse.json(mapRowToStore(data as unknown as StoreRow));
  } catch (error) {
    if (error instanceof StorePatchError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error('Admin store update failed', error);
    return NextResponse.json({ error: 'Could not save store changes. Please retry.' }, { status: 500 });
  }
}

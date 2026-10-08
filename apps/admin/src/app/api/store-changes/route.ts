// Store profile changes waiting for admin review (migration 114). A partner
// edit to a store's name, category, address, map pin or drug licence is
// filed by PATCH /partner/store as a store_profile_change_requests row; the
// live store keeps its values until approved via ./[id].
// GET → every pending request (oldest first); ?storeId= → that store's
// pending and decided requests (newest first).

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { STORE_CHANGE_SELECT, mapStoreChange, type StoreChangeRow } from '@/lib/storeChanges';

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const storeId = new URL(request.url).searchParams.get('storeId');
  let query = supabaseAdmin.from('store_profile_change_requests').select(STORE_CHANGE_SELECT);
  if (storeId) {
    if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(storeId)) return NextResponse.json({ error: 'Invalid store ID.' }, { status: 400 });
    query = query.eq('store_id', storeId).neq('status', 'superseded');
  } else {
    query = query.eq('status', 'pending');
  }
  const { data, error } = await query.order('created_at', { ascending: !storeId }).limit(100);
  if (error) {
    console.error('Store change requests read failed', error);
    return NextResponse.json({ error: 'Could not load store changes.' }, { status: 500 });
  }
  return NextResponse.json((data as unknown as StoreChangeRow[]).map(mapStoreChange));
}

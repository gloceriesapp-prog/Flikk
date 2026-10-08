import { requireStoreAdmin } from '@/features/store-management/adminGate';
// Admin "Add store" — see lib/storeValidation.ts's note. Same end state as
// approving a partner application: the store is owned by the existing
// account with that phone, which becomes an approved store_owner. Refused if
// the account already owns a store (also enforced by migration 110's
// stores_one_per_owner trigger) or belongs to a rider/admin.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { STORE_SELECT, mapRowToStore, type StoreRow } from '@/lib/supabase/stores';
import { normalizeOwnerPhone, ownerPhoneVariants, toStoreRow, validateStoreInput, type StoreWriteInput } from '@/lib/storeValidation';

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: Request) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => null);

  const input: Partial<StoreWriteInput> = body ?? {};
  try {
    validateStoreInput(input);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Invalid store details.', 400);
  }

  try {
    const phone = normalizeOwnerPhone(input.ownerPhone)!;
    const { data: owners, error: ownerError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .in('phone', ownerPhoneVariants(phone))
      .limit(2);
    if (ownerError) throw ownerError;
    if (!owners?.length) {
      return fail('No Gloceries account uses that phone. Ask the owner to sign in to the Gloceries Partner app once with it, then try again.', 404);
    }
    if (owners.length > 1) return fail('More than one account matches that phone. Resolve the duplicate account first.', 409);
    const owner = owners[0];
    if (owner.role === 'rider' || owner.role === 'admin') {
      return fail(`That phone belongs to a ${owner.role} account. One phone number can hold only one role.`, 409);
    }
    const { count, error: countError } = await supabaseAdmin.from('stores').select('id', { count: 'exact', head: true }).eq('owner_user_id', owner.id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) return fail('That account already owns a store. Edit the existing store instead.', 409);

    const { data: zones, error: zoneError } = await supabaseAdmin.from('zones').select('id').eq('is_active', true);
    if (zoneError) throw zoneError;
    if (!zones?.length) return fail('No active zone configured. Activate a zone first.', 400);
    const zone = input.zoneId ? zones.find((z) => z.id === input.zoneId) : zones.length === 1 ? zones[0] : undefined;
    if (!zone) return fail(input.zoneId ? 'Pick an active zone.' : 'Several zones are active — choose the store’s zone.', 400);

    const { data, error } = await supabaseAdmin.from('stores').insert(toStoreRow(input, owner.id, zone.id)).select(STORE_SELECT).single();
    if (error?.code === 'P0409' && error.message === 'STORE_MANAGER_CANNOT_OWN') return fail('Remove this account from its current store team before making it a primary owner.', 409);
    if (error?.code === 'P0409' && error.message === 'STORE_ALREADY_OWNED') return fail('That account already owns a store.', 409);
    if (error) throw error;

    // Same role/approval the normal approval path sets.
    const { error: roleError } = await supabaseAdmin
      .from('users')
      .update({ role: 'store_owner', is_approved: true, is_rejected: false })
      .eq('id', owner.id);
    if (roleError) {
      await supabaseAdmin.from('stores').delete().eq('id', (data as { id: string }).id);
      throw roleError;
    }
    // Nothing left to resume into once the real store exists (as in approval).
    await supabaseAdmin.from('store_onboarding_drafts').delete().eq('user_id', owner.id);

    return NextResponse.json(mapRowToStore(data as unknown as StoreRow));
  } catch (err) {
    console.error('Admin add store failed', err);
    return fail('Could not add the store. Please retry.', 500);
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

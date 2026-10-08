// Set or replace a store's payout destination from admin — e.g. an
// admin-created store whose owner never uses the partner app. Goes through
// admin_set_store_payout_account (migration 110), which writes the same
// payout_* columns as PUT /partner/payout-account and resets verification,
// so the founder still verifies the name before marking a payout paid.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseStorePayoutInput, STORE_PAYOUT_SELECT, toStorePayoutView } from '@/lib/storePayout';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PUT(request: Request, ctx: RouteContext<'/api/stores/[id]/payout-account'>) {
  const { actor: user, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid store ID.' }, { status: 400 });

  const input = parseStorePayoutInput(await request.json().catch(() => null));
  if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 });

  const { error } = await supabaseAdmin.rpc('admin_set_store_payout_account', {
    p_store: id,
    p_method: input.method,
    p_upi_id: input.method === 'upi' ? input.upiId : null,
    p_account_holder_name: input.method === 'bank' ? input.accountHolderName : null,
    p_account_number: input.method === 'bank' ? input.accountNumber : null,
    p_ifsc: input.method === 'bank' ? input.ifsc : null,
    p_bank_name: input.method === 'bank' ? (input.bankName ?? null) : null,
    p_admin: user.id,
  });
  if (error) {
    if (error.code === 'P0404') return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    if (error.code === 'P0400') return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'Could not save the payout account. Try again.' }, { status: 500 });
  }
  const { data } = await supabaseAdmin.from('stores').select(STORE_PAYOUT_SELECT).eq('id', id).maybeSingle();
  return NextResponse.json(toStorePayoutView(data as Record<string, string | null> | null));
}

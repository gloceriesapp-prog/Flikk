// Record that a rider handed over the cash they collected on delivery. The
// settle_rider_cash RPC (migration 108) stamps settled_at/settled_by and the
// reference on the rider's unsettled collections — all of them, or only the
// ids given — and never touches a row that is already settled, so a repeated
// click settles nothing twice.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseSettleInput } from '@/lib/cashCollectionValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: Request) {
  const { actor: user, denied } = await requireAdmin();
  if (denied) return denied;

  const input = parseSettleInput(await request.json().catch(() => null));
  if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc('settle_rider_cash', {
    p_rider: input.riderId,
    p_admin: user.id,
    p_reference: input.reference,
    p_collections: input.collectionIds,
  });
  if (error) {
    if (error.code === '22023') return NextResponse.json({ error: 'Invalid settlement.' }, { status: 400 });
    return NextResponse.json({ error: 'Could not record the settlement. Please try again.' }, { status: 500 });
  }
  const result = data as { settled_count: number; settled_amount: number | string };
  return NextResponse.json({ settledCount: Number(result.settled_count), settledAmount: Number(result.settled_amount) });
}

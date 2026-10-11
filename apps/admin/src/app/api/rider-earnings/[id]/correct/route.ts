// Correct one mis-recorded rider earning (money path). admin_correct_rider_earning
// (migration 20261010120100) locks the row, refuses an already-settled earning
// unless allowSettled, writes an append-only rider_earning_corrections audit row
// and returns old/new/delta in paise. Idempotent: re-sending the same amount
// returns changed=false and writes no audit row (safe to retry on a flaky
// network). Paying still happens on the Payouts page — this only fixes the
// recorded amount, never paid_at / rider_payout_id.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { isUuid } from '@/lib/orders/adminActor';
import { controlRpcStatus } from '@/lib/pushOutbox';
import { validateCorrectionInput } from '@/lib/riderEarningCorrection';

export async function POST(request: Request, ctx: RouteContext<'/api/rider-earnings/[id]/correct'>) {
  const { actor, denied } = await requireAdmin();
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: 'Rider earning not found.' }, { status: 404 });

  const raw = (await request.json().catch(() => null)) as { amountPaise?: unknown; reason?: unknown; allowSettled?: unknown } | null;
  const valid = validateCorrectionInput(raw ?? {});
  if (!valid.ok) return NextResponse.json({ error: valid.error }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc('admin_correct_rider_earning', {
    p_earning: id,
    p_new_amount_paise: valid.amountPaise,
    p_reason: valid.reason,
    p_admin_email: actor.email,
    p_allow_settled: raw?.allowSettled === true,
  });
  if (error) {
    const status = controlRpcStatus(error.code);
    return NextResponse.json({ error: status ? error.message : 'Could not correct this earning.' }, { status: status ?? 500 });
  }
  return NextResponse.json(data);
}

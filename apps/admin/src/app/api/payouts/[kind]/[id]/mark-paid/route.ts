// Record one manual payout as paid (backend/PAYOUTS.md). The founder has
// already moved the money outside the app; this stores the UTR via the
// mark_payout_paid RPC, which locks the row, snapshots the payee
// destination and enforces UTR uniqueness/idempotency.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapRpcError, parseKindAndId, parseMarkPaidInput } from '@/lib/payoutValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  const { actor: user, denied } = await requireAdmin();
  if (denied) return denied;

  const { kind, id } = await context.params;
  const target = parseKindAndId(kind, id);
  if (!target) return NextResponse.json({ error: 'Invalid payout.' }, { status: 400 });

  const input = parseMarkPaidInput(await request.json().catch(() => null));
  if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc('mark_payout_paid', {
    p_kind: target.kind,
    p_payout_id: target.id,
    p_utr: input.utr,
    p_mode: input.mode,
    p_admin: user.id,
    p_note: input.note,
  });
  if (error) {
    const mapped = mapRpcError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json(data);
}

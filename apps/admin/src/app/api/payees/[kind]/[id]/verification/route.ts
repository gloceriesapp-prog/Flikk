// Mark a payee's payout destination verified/unverified (backend/PAYOUTS.md).
// "Verified" = the founder saw the account holder name in their UPI app or
// bank before paying; verifiedName is that name. Any later change to the
// payee's details resets it to unverified (DB trigger).
// [id] = stores.id for a store, users.id (riders.user_id) for a rider.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { mapRpcError, parseKindAndId, parseVerificationInput } from '@/lib/payoutValidation';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  const { actor: user, denied } = await requireAdmin();
  if (denied) return denied;

  const { kind, id } = await context.params;
  const target = parseKindAndId(kind, id);
  if (!target) return NextResponse.json({ error: 'Invalid payee.' }, { status: 400 });

  const input = parseVerificationInput(await request.json().catch(() => null));
  if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 });

  const { error } = await supabaseAdmin.rpc('set_payee_verification', {
    p_kind: target.kind,
    p_payee_id: target.id,
    p_verified: input.verified,
    p_verified_name: input.verifiedName,
    p_admin: user.id,
  });
  if (error) {
    const mapped = mapRpcError(error);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
  return NextResponse.json({ ok: true });
}

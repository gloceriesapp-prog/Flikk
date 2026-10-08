// "Mark refunded manually" — for refunds in 'manual_required' (legacy-provider
// payments Cashfree can't refund). The founder pays the customer by bank/UPI
// outside the system and records the reference here. The RPC does the
// guarded transition (manual_required -> completed) and closes the refund job
// in one transaction, so a double-submit can't record two refunds.
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { manualRefundReference } from '@/lib/refunds/failedDeliveryRefund';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { reference?: unknown } | null;
  const reference = manualRefundReference(body?.reference);
  if (!reference) {
    return NextResponse.json({ error: 'Enter the bank/UPI reference (UTR) for the refund you sent.' }, { status: 400 });
  }

  try {
    const { error } = await supabaseAdmin.rpc('mark_order_refund_manual', { p_order: id, p_reference: reference });
    if (error) return NextResponse.json({ error: error.message || 'This refund is not awaiting a manual payout.' }, { status: 409 });
    return NextResponse.json({ refundStatus: 'completed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not record manual refund.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

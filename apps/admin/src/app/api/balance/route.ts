// Overview's Balance card — real numbers, two sources:
//  - availableToWithdraw: RazorpayX's own account balance (lib/razorpay/balance.ts)
//  - lastWithdrawn / pendingSettlement: the payouts table (service role —
//    payouts has no public RLS read policy, same rationale as every other
//    service-role route here), which is the actual ledger of money already
//    moved to stores, not an estimate.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchRazorpayBalance } from '@/lib/razorpay/balance';

export async function GET() {
  try {
    const [balance, lastPaidRes, pendingRes] = await Promise.all([
      fetchRazorpayBalance(),
      supabaseAdmin.from('payouts').select('net_payout, paid_at').eq('status', 'paid').not('paid_at', 'is', null).order('paid_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('payouts').select('net_payout').in('status', ['pending', 'processing']),
    ]);

    if (lastPaidRes.error) throw lastPaidRes.error;
    if (pendingRes.error) throw pendingRes.error;

    const pendingSettlement = (pendingRes.data ?? []).reduce((sum, row) => sum + Number(row.net_payout), 0);

    return NextResponse.json({
      configured: balance.configured,
      availableToWithdraw: balance.availableRupees,
      lastWithdrawnAmount: lastPaidRes.data ? Number(lastPaidRes.data.net_payout) : null,
      lastWithdrawnAt: lastPaidRes.data?.paid_at ?? null,
      pendingSettlement,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load balance.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

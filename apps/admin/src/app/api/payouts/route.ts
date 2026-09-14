// Revenue page's real payouts — service role, same rationale as every
// other route here (payouts has no public RLS read policy admin can use).
// commissionRate is derived (commission_deducted / gross_amount), not
// stored — payouts only carries the two amounts, matching the real
// migrations/001_init.sql columns.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Payout } from '@/lib/types';

interface PayoutRow {
  id: string;
  week_start: string;
  week_end: string;
  gross_amount: number;
  commission_deducted: number;
  net_payout: number;
  status: string;
  paid_at: string | null;
  stores: { name: string; bank_name: string | null; bank_account_last4: string | null } | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('payouts')
      .select('id, week_start, week_end, gross_amount, commission_deducted, net_payout, status, paid_at, stores(name, bank_name, bank_account_last4)')
      .order('week_start', { ascending: false });
    if (error) throw error;

    const payouts: Payout[] = ((data ?? []) as unknown as PayoutRow[]).map((row) => ({
      id: row.id,
      storeName: row.stores?.name ?? 'Unknown store',
      cycleLabel: `Week of ${formatDate(row.week_start)}`,
      grossSales: Number(row.gross_amount),
      commissionRate: Number(row.gross_amount) > 0 ? Number(row.commission_deducted) / Number(row.gross_amount) : 0,
      netPayout: Number(row.net_payout),
      // Schema also allows 'processing'/'blocked'/'failed' (migrations/012)
      // — this dashboard's Payout type only distinguishes pending vs. paid,
      // so every non-paid status renders as pending for now.
      status: row.status === 'paid' ? 'paid' : 'pending',
      paidAt: row.paid_at ? formatDate(row.paid_at) : null,
      bankName: row.stores?.bank_name ?? '',
      bankAccountLast4: row.stores?.bank_account_last4 ?? '',
    }));

    return NextResponse.json(payouts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load payouts.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Revenue page's "Release this week's payouts" button — the real weekly
// settlement mechanism until RazorpayX payout automation exists
// (SETTLEMENT_CADENCE_LABEL's own note in mock-data.ts). Marks every
// currently-pending payout as paid, stamping paid_at the same way
// jobs/weeklyPayouts.ts and the RazorpayX webhook do for the automated
// path (migrations/016_payout_paid_at.sql).
export async function PATCH() {
  try {
    const { error } = await supabaseAdmin
      .from('payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('status', 'pending');
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not release payouts.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

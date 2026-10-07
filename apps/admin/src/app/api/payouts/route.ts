// Store payouts for the Revenue page — service role (payouts has no RLS read
// policy admin can use). commissionRate is derived, not stored.
//
// Payouts are released manually while no payout provider is active: the
// founder transfers each store's net payout from the bank, then marks that
// single payout paid with the bank reference (UTR). One payout per request,
// never a bulk "mark everything paid" — a failed transfer must stay pending.

import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Payout } from '@/lib/types';

interface StoreDestinationRow {
  name: string;
  payout_method: 'upi' | 'bank_account' | null;
  payout_upi_id: string | null;
  payout_bank_account_number: string | null;
  payout_bank_ifsc: string | null;
  payout_account_holder_name: string | null;
  payout_upi_verified_name: string | null;
  payout_details_verified: boolean | null;
}

interface PayoutRow {
  id: string;
  week_start: string;
  gross_amount: number;
  commission_deducted: number;
  net_payout: number;
  status: string;
  paid_at: string | null;
  payment_reference: string | null;
  stores: StoreDestinationRow | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function destinationOf(store: StoreDestinationRow | null): Payout['destination'] {
  if (!store?.payout_method) return null;
  return {
    method: store.payout_method,
    upiId: store.payout_upi_id,
    accountNumber: store.payout_bank_account_number,
    ifsc: store.payout_bank_ifsc,
    holderName: store.payout_upi_verified_name ?? store.payout_account_holder_name,
    verified: store.payout_details_verified === true,
  };
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('payouts')
      .select('id, week_start, gross_amount, commission_deducted, net_payout, status, paid_at, payment_reference, stores(name, payout_method, payout_upi_id, payout_bank_account_number, payout_bank_ifsc, payout_account_holder_name, payout_upi_verified_name, payout_details_verified)')
      .order('week_start', { ascending: false });
    if (error) throw error;

    const payouts: Payout[] = ((data ?? []) as unknown as PayoutRow[]).map((row) => ({
      id: row.id,
      storeName: row.stores?.name ?? 'Unknown store',
      cycleLabel: `Week of ${formatDate(row.week_start)}`,
      grossSales: Number(row.gross_amount),
      commissionRate: Number(row.gross_amount) > 0 ? Number(row.commission_deducted) / Number(row.gross_amount) : 0,
      netPayout: Number(row.net_payout),
      status: row.status === 'paid' ? 'paid' : 'pending',
      paidAt: row.paid_at ? formatDate(row.paid_at) : null,
      paymentReference: row.payment_reference,
      destination: destinationOf(row.stores),
    }));

    return NextResponse.json(payouts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load payouts.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH { id, reference } — marks one payout paid after the founder has sent
// the money (mark_payout_paid_manually, migration 096). Only pending/blocked/
// failed rows qualify, so a double submit is a 409, never a second reference.
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { id?: unknown; reference?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id : '';
    const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Choose a payout.' }, { status: 400 });
    if (!/^[A-Za-z0-9-]{6,40}$/.test(reference)) {
      return NextResponse.json({ error: 'Enter the bank reference (UTR / UPI transaction ID), 6–40 letters or digits.' }, { status: 400 });
    }

    const { data: marked, error } = await supabaseAdmin.rpc('mark_payout_paid_manually', { p_kind: 'store', p_id: id, p_reference: reference });
    if (error) throw error;
    if (marked !== true) return NextResponse.json({ error: 'This payout is already paid or is being processed.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not mark this payout paid.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

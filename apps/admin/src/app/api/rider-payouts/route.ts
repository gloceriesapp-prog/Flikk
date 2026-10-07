// Rider payouts. A rider earns each delivered order's delivery fee
// (rider_earnings); the backend's weekly job groups a week's earnings into one
// rider_payouts row (create_weekly_rider_payouts, worker process). Riders are
// paid manually while no payout provider is active: the founder sends each
// weekly payout from the bank, then marks that one row paid with the bank
// reference (mark_payout_paid_manually, migration 096), which also stamps the
// linked rider_earnings in the same transaction.
//
// "Accruing" = delivered but not yet grouped into a weekly payout. It is shown
// for visibility only; it becomes payable after the next weekly run.

import { NextResponse, type NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface RiderRow {
  user_id: string;
  name: string | null;
  phone: string | null;
  payout_method: 'upi' | 'bank_account' | null;
  payout_upi_id: string | null;
  payout_bank_account_number: string | null;
  payout_bank_ifsc: string | null;
  payout_account_holder_name: string | null;
  payout_upi_verified_name: string | null;
  payout_details_verified: boolean | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function GET() {
  try {
    const [payoutsRes, accruingRes, ridersRes] = await Promise.all([
      supabaseAdmin
        .from('rider_payouts')
        .select('id, rider_id, week_start, amount, status, paid_at, payment_reference')
        .order('week_start', { ascending: false })
        .limit(500),
      supabaseAdmin.from('rider_earnings').select('rider_id, amount').is('paid_at', null).is('rider_payout_id', null),
      supabaseAdmin
        .from('riders')
        .select('user_id, name, phone, payout_method, payout_upi_id, payout_bank_account_number, payout_bank_ifsc, payout_account_holder_name, payout_upi_verified_name, payout_details_verified'),
    ]);
    for (const r of [payoutsRes, accruingRes, ridersRes]) if (r.error) throw r.error;

    const riders = new Map(((ridersRes.data ?? []) as RiderRow[]).map((r) => [r.user_id, r]));
    const accruing = new Map<string, number>();
    for (const row of (accruingRes.data ?? []) as { rider_id: string; amount: number }[]) {
      accruing.set(row.rider_id, (accruing.get(row.rider_id) ?? 0) + Number(row.amount));
    }

    const payouts = ((payoutsRes.data ?? []) as {
      id: string; rider_id: string; week_start: string; amount: number; status: string; paid_at: string | null; payment_reference: string | null;
    }[]).map((p) => {
      const rider = riders.get(p.rider_id);
      return {
        id: p.id,
        riderName: rider?.name ?? 'Unnamed rider',
        riderPhone: rider?.phone ?? '',
        cycleLabel: `Week of ${formatDate(p.week_start)}`,
        amount: Number(p.amount),
        status: p.status === 'paid' ? 'paid' : 'pending',
        paidAt: p.paid_at ? formatDate(p.paid_at) : null,
        paymentReference: p.payment_reference,
        destination: rider?.payout_method
          ? {
              method: rider.payout_method,
              upiId: rider.payout_upi_id,
              accountNumber: rider.payout_bank_account_number,
              ifsc: rider.payout_bank_ifsc,
              holderName: rider.payout_upi_verified_name ?? rider.payout_account_holder_name,
              verified: rider.payout_details_verified === true,
            }
          : null,
      };
    });

    const accruingRows = [...accruing.entries()]
      .map(([riderId, amount]) => ({ riderId, riderName: riders.get(riderId)?.name ?? 'Unnamed rider', amount }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({ payouts, accruing: accruingRows });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load rider payouts.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH { id, reference } — one weekly rider payout, after the money is sent.
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { id?: unknown; reference?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id : '';
    const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Choose a payout.' }, { status: 400 });
    if (!/^[A-Za-z0-9-]{6,40}$/.test(reference)) {
      return NextResponse.json({ error: 'Enter the bank reference (UTR / UPI transaction ID), 6–40 letters or digits.' }, { status: 400 });
    }
    const { data: marked, error } = await supabaseAdmin.rpc('mark_payout_paid_manually', { p_kind: 'rider', p_id: id, p_reference: reference });
    if (error) throw error;
    if (marked !== true) return NextResponse.json({ error: 'This payout is already paid or is being processed.' }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not mark this payout paid.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

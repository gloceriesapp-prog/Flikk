// Admin Payouts list — store (payouts) + rider (rider_payouts) weekly rows in
// one combined list, with full payee destination (admin only; partner/rider
// clients only ever get last4). Contract: backend/PAYOUTS.md, Admin section.
// Read-only: paying is per row via /api/payouts/[kind]/[id]/mark-paid.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AdminPayoutRow, PayoutRowStatus } from '@/lib/types';

const PAYOUT_COLS = 'id, week_start, week_end, status, paid_at, utr, payment_mode, paid_by, payment_note';
const PAYEE_COLS =
  'name, phone, payout_method, payout_upi_id, payout_bank_account_number, payout_bank_ifsc, payout_bank_name, payout_account_holder_name, payout_upi_verified_name, payout_details_status, payout_proof_path';

interface PayeeRow {
  name: string | null;
  phone: string | null;
  payout_method: string | null;
  payout_upi_id: string | null;
  payout_bank_account_number: string | null;
  payout_bank_ifsc: string | null;
  payout_bank_name: string | null;
  payout_account_holder_name: string | null;
  payout_upi_verified_name: string | null;
  payout_details_status: string | null;
  payout_proof_path: string | null;
}

interface PayoutBase {
  id: string;
  week_start: string;
  week_end: string;
  status: PayoutRowStatus;
  paid_at: string | null;
  utr: string | null;
  payment_mode: 'upi' | 'bank_transfer' | null;
  paid_by: string | null;
  payment_note: string | null;
}

// 'pending' tab = everything still owed (failed/blocked included so nothing owed is hidden).
const STATUS_FILTER: Record<string, PayoutRowStatus[] | null> = {
  pending: ['pending', 'failed', 'blocked'],
  paid: ['paid'],
  all: null,
};

function toRow(kind: 'store' | 'rider', payeeId: string, base: PayoutBase, amount: unknown, payee: PayeeRow | null): AdminPayoutRow {
  // DB has carried 'bank_account' (pre-102) and the contract says 'bank' — accept both.
  const method = payee?.payout_method === 'upi' ? 'upi' : payee?.payout_method ? 'bank' : null;
  return {
    kind,
    id: base.id,
    payeeId,
    payeeName: payee?.name ?? (kind === 'store' ? 'Unknown store' : 'Unknown rider'),
    phone: payee?.phone ?? null,
    method,
    upiId: payee?.payout_upi_id ?? null,
    accountNumber: payee?.payout_bank_account_number ?? null,
    ifsc: payee?.payout_bank_ifsc ?? null,
    bankName: payee?.payout_bank_name ?? null,
    accountHolderName: payee?.payout_account_holder_name ?? null,
    hasProof: Boolean(payee?.payout_proof_path),
    verification: payee?.payout_details_status === 'verified' ? 'verified' : 'unverified',
    verifiedName: payee?.payout_upi_verified_name ?? null,
    netAmount: Number(amount),
    weekStart: base.week_start,
    weekEnd: base.week_end,
    status: base.status,
    utr: base.utr,
    paymentMode: base.payment_mode,
    paidAt: base.paid_at,
    paidBy: base.paid_by,
    note: base.payment_note,
  };
}

export async function GET(request: NextRequest) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const status = request.nextUrl.searchParams.get('status') ?? 'pending';
  const kind = request.nextUrl.searchParams.get('kind') ?? 'all';
  if (!(status in STATUS_FILTER)) return NextResponse.json({ error: 'status must be pending, paid or all.' }, { status: 400 });
  if (!['store', 'rider', 'all'].includes(kind)) return NextResponse.json({ error: 'kind must be store, rider or all.' }, { status: 400 });
  const statuses = STATUS_FILTER[status];

  try {
    const rows: AdminPayoutRow[] = [];

    if (kind !== 'rider') {
      let q = supabaseAdmin.from('payouts').select(`${PAYOUT_COLS}, store_id, net_payout, stores(${PAYEE_COLS})`);
      if (statuses) q = q.in('status', statuses);
      const { data, error } = await q.order('week_start', { ascending: false });
      if (error) throw error;
      for (const r of (data ?? []) as unknown as (PayoutBase & { store_id: string; net_payout: unknown; stores: PayeeRow | null })[]) {
        rows.push(toRow('store', r.store_id, r, r.net_payout, r.stores));
      }
    }

    if (kind !== 'store') {
      let q = supabaseAdmin.from('rider_payouts').select(`${PAYOUT_COLS}, rider_id, amount`);
      if (statuses) q = q.in('status', statuses);
      const { data, error } = await q.order('week_start', { ascending: false });
      if (error) throw error;
      const payoutRows = (data ?? []) as unknown as (PayoutBase & { rider_id: string; amount: unknown })[];
      // rider_payouts.rider_id is users.id; riders has no FK from rider_payouts, so join by hand.
      const userIds = [...new Set(payoutRows.map((r) => r.rider_id))];
      const riders = new Map<string, PayeeRow>();
      if (userIds.length > 0) {
        const res = await supabaseAdmin.from('riders').select(`user_id, ${PAYEE_COLS}`).in('user_id', userIds);
        if (res.error) throw res.error;
        for (const r of (res.data ?? []) as unknown as (PayeeRow & { user_id: string })[]) riders.set(r.user_id, r);
      }
      for (const r of payoutRows) rows.push(toRow('rider', r.rider_id, r, r.amount, riders.get(r.rider_id) ?? null));
    }

    // paid_by is an auth user id — show the admin's email instead (one founder, so at most a handful of lookups).
    const adminIds = [...new Set(rows.map((r) => r.paidBy).filter((id): id is string => Boolean(id)))];
    const emails = new Map<string, string>();
    await Promise.all(
      adminIds.map(async (id) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        if (data.user?.email) emails.set(id, data.user.email);
      }),
    );
    for (const r of rows) if (r.paidBy) r.paidBy = emails.get(r.paidBy) ?? r.paidBy;

    rows.sort((a, b) => b.weekStart.localeCompare(a.weekStart) || a.payeeName.localeCompare(b.payeeName));
    return NextResponse.json(rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Could not load payouts.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

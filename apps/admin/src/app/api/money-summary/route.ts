// Revenue page's money split: what Gloceries earned kept apart from what is
// owed to stores and riders. Summed in Postgres (admin_money_summary,
// migration 20261027120000); lib/moneySummary.ts has the shapes.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { moneyRangeStart, parseMoneyRange, toMoneySummary, type MoneySummaryRow } from '@/lib/moneySummary';

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const range = parseMoneyRange(new URL(request.url).searchParams.get('range'));
  const from = moneyRangeStart(range);
  try {
    const { data, error } = await supabaseAdmin.rpc('admin_money_summary', { p_from: from?.toISOString() ?? null, p_to: null });
    if (error) throw error;
    return NextResponse.json(toMoneySummary((data ?? {}) as MoneySummaryRow, range, from));
  } catch (err) {
    console.error('Money summary failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load the money summary.' }, { status: 500 });
  }
}

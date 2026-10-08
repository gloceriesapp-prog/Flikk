// Rider earnings ledger — one row per rider_earnings entry (a delivered or
// failed order/trip: base + extra-stop split from migration 108, earned_at
// from 073, paid via rider_payouts). Filters: ?rider=<users.id>, ?from= and
// ?to= (YYYY-MM-DD, IST, inclusive), ?page=. Paged server-side with an exact
// count, so there is no 1000-row cap. Weekly totals for the same filter come
// from admin_rider_earning_weeks (migration 113), aggregated in SQL.

import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/orders/adminActor';
import type { RiderEarningRow, RiderEarningWeek } from '@/lib/types';

const PAGE_SIZE = 50;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

interface EarningRow {
  id: string;
  rider_id: string;
  order_id: string;
  trip_id: string | null;
  amount: number | string;
  base_amount: number | string | null;
  extra_stop_amount: number | string | null;
  earned_at: string | null;
  paid_at: string | null;
  rider_payout_id: string | null;
}

interface WeekRow {
  week_start: string;
  deliveries: number | string;
  total: number | string;
  base: number | string;
  extra: number | string;
  paid: number | string;
  unpaid: number | string;
}

// IST calendar day -> UTC instant of its midnight.
function istMidnight(day: string): Date {
  return new Date(`${day}T00:00:00+05:30`);
}

export async function GET(request: NextRequest) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const params = request.nextUrl.searchParams;
  const rider = params.get('rider') || null;
  const from = params.get('from') || null;
  const to = params.get('to') || null;
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
  if (rider && !isUuid(rider)) return NextResponse.json({ error: 'Unknown rider.' }, { status: 400 });
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) return NextResponse.json({ error: 'Dates must be YYYY-MM-DD.' }, { status: 400 });
  const fromAt = from ? istMidnight(from) : null;
  const untilAt = to ? new Date(istMidnight(to).getTime() + DAY_MS) : null;
  if (fromAt && untilAt && untilAt <= fromAt) return NextResponse.json({ error: 'The start date must be on or before the end date.' }, { status: 400 });

  try {
    let query = supabaseAdmin
      .from('rider_earnings')
      .select('id, rider_id, order_id, trip_id, amount, base_amount, extra_stop_amount, earned_at, paid_at, rider_payout_id', { count: 'exact' });
    if (rider) query = query.eq('rider_id', rider);
    if (fromAt) query = query.gte('earned_at', fromAt.toISOString());
    if (untilAt) query = query.lt('earned_at', untilAt.toISOString());
    const offset = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query
      .order('earned_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const earnings = (data ?? []) as EarningRow[];

    const riderIds = [...new Set(earnings.map((e) => e.rider_id))];
    const names = new Map<string, string>();
    if (riderIds.length > 0) {
      const { data: riders, error: ridersError } = await supabaseAdmin.from('riders').select('user_id, name').in('user_id', riderIds);
      if (ridersError) throw ridersError;
      for (const r of riders ?? []) names.set(r.user_id as string, r.name as string);
    }

    const items: RiderEarningRow[] = earnings.map((e) => {
      const amount = Number(e.amount);
      const extra = Number(e.extra_stop_amount ?? 0);
      return {
        id: e.id,
        riderUserId: e.rider_id,
        riderName: names.get(e.rider_id) ?? 'Unknown rider',
        orderId: e.order_id,
        tripId: e.trip_id,
        baseAmount: e.base_amount != null ? Number(e.base_amount) : amount - extra,
        extraStopAmount: extra,
        amount,
        earnedAt: e.earned_at,
        paidAt: e.paid_at,
        status: e.paid_at ? 'paid' : e.rider_payout_id ? 'in_payout' : 'unpaid',
      };
    });

    // Weekly totals cover the whole filter, not just this page. Without a
    // date filter they cover the last 12 weeks (the RPC caps a call at 400 days).
    const weeksUntil = untilAt ?? new Date(Date.now() + DAY_MS);
    const weeksFrom = fromAt ?? new Date(weeksUntil.getTime() - 12 * 7 * DAY_MS);
    let weeks: RiderEarningWeek[] = [];
    let weeksTruncated = false;
    if (weeksUntil.getTime() - weeksFrom.getTime() <= 400 * DAY_MS) {
      const { data: weekRows, error: weeksError } = await supabaseAdmin.rpc('admin_rider_earning_weeks', {
        p_rider: rider,
        p_from: weeksFrom.toISOString(),
        p_until: weeksUntil.toISOString(),
      });
      if (weeksError) throw weeksError;
      weeks = ((weekRows ?? []) as WeekRow[]).map((w) => ({
        weekStart: w.week_start,
        deliveries: Number(w.deliveries),
        total: Number(w.total),
        base: Number(w.base),
        extra: Number(w.extra),
        paid: Number(w.paid),
        unpaid: Number(w.unpaid),
      }));
    } else {
      weeksTruncated = true;
    }

    return NextResponse.json({ items, total: count ?? 0, page, pageSize: PAGE_SIZE, weeks, weeksTruncated, weeksFrom: weeksFrom.toISOString() });
  } catch (err) {
    console.error('Rider earnings load failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load rider earnings.' }, { status: 500 });
  }
}

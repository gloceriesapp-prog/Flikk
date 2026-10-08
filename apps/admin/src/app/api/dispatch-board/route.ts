// Trips & dispatch board — admin_dispatch_board (migration 113): one row per
// live trip (or single order) with its rider, current offer ring and how many
// rings were offered. ?outOfOffers=1 keeps only scopes where every configured
// ring was offered with no rider, so only manual assignment will move them.
// Paged server-side (?page=, 50 per page).

import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { DispatchBoardRow } from '@/lib/types';

const PAGE_SIZE = 50;

interface Row {
  scope_id: string;
  trip_id: string | null;
  order_ids: string[];
  assign_order_id: string | null;
  legs: number;
  statuses: string[];
  store_names: string[];
  rider_id: string | null;
  rider_name: string | null;
  placed_at: string | null;
  total: number | string | null;
  dispatch_radius_m: number | null;
  dispatch_attempts: number | null;
  dispatch_broadcast_at: string | null;
  awaiting_rider: boolean;
  out_of_offers: boolean;
  total_count: number | string;
}

export async function GET(request: NextRequest) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
  const outOfOffers = params.get('outOfOffers') === '1';
  try {
    const { data, error } = await supabaseAdmin.rpc('admin_dispatch_board', {
      p_out_of_offers: outOfOffers,
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
    });
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    const items: DispatchBoardRow[] = rows.map((row) => ({
      scopeId: row.scope_id,
      tripId: row.trip_id,
      orderIds: row.order_ids,
      assignOrderId: row.assign_order_id,
      legs: row.legs,
      statuses: row.statuses,
      storeNames: row.store_names,
      riderUserId: row.rider_id,
      riderName: row.rider_name,
      placedAt: row.placed_at,
      total: Number(row.total ?? 0),
      radiusKm: row.dispatch_radius_m != null ? row.dispatch_radius_m / 1000 : null,
      attempts: row.dispatch_attempts ?? 0,
      lastOfferAt: row.dispatch_broadcast_at,
      awaitingRider: row.awaiting_rider,
      outOfOffers: row.out_of_offers,
    }));
    return NextResponse.json({ items, total: Number(rows[0]?.total_count ?? 0), page, pageSize: PAGE_SIZE });
  } catch (err) {
    console.error('Dispatch board failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load trips.' }, { status: 500 });
  }
}

// Riders page's real data — service role, same rationale as app/api/orders
// (riders has no public RLS read policy admin can use). activeOrders is a
// live count from orders (not a stored column), since a rider's load
// changes on every order write, not just when their own row changes.
//
// isOnline maps to riders.is_active — the only on/off signal this schema
// actually has. There's no shift/presence table (a rider going "on shift"
// vs. just having an active account are the same bit here) — adding real
// presence tracking is new infra, not this fix's scope.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ActiveRider } from '@/lib/types';

interface RiderRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
}

export async function GET() {
  try {
    const [ridersRes, ordersRes] = await Promise.all([
      supabaseAdmin.from('riders').select('id, user_id, name, phone, is_active').order('name'),
      supabaseAdmin.from('orders').select('rider_id').not('rider_id', 'is', null).not('status', 'in', '(delivered,cancelled)'),
    ]);
    if (ridersRes.error) throw ridersRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const activeOrderCounts = new Map<string, number>();
    for (const row of ordersRes.data ?? []) {
      const riderId = row.rider_id as string;
      activeOrderCounts.set(riderId, (activeOrderCounts.get(riderId) ?? 0) + 1);
    }

    const riders: ActiveRider[] = ((ridersRes.data ?? []) as RiderRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      activeOrders: activeOrderCounts.get(row.user_id) ?? 0,
      zone: 'Kaup, Udupi',
      isOnline: row.is_active,
    }));

    return NextResponse.json(riders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load riders.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

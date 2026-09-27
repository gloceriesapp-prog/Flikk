// Riders page's real data — service role, same rationale as app/api/orders
// (riders has no public RLS read policy admin can use). activeOrders is a
// live count from orders (not a stored column), since a rider's load
// changes on every order write, not just when their own row changes.
//
// isOnline maps to riders.is_active — kept as the account-active bit that
// AssignRiderRow filters the assignable roster on. Live presence now DOES
// exist as riders.status (offline/online/on_delivery) and is surfaced
// separately as `presence`; the two are not the same signal (see the inline
// note on the mapping below). Also surfaces riders.availability + auto_online
// so the founder can see each rider's configured working hours and whether
// they're on-schedule right now.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isWithinSchedule, type DaySchedule } from '@/lib/riderSchedule';
import type { ActiveRider } from '@/lib/types';

interface RiderRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
  status: 'offline' | 'online' | 'on_delivery' | null;
  availability: DaySchedule[] | null;
  auto_online: boolean | null;
}

export async function GET() {
  try {
    const [ridersRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from('riders')
        .select('id, user_id, name, phone, is_active, status, availability, auto_online')
        .order('name'),
      supabaseAdmin.from('orders').select('rider_id').not('rider_id', 'is', null).not('status', 'in', '(delivered,cancelled)'),
    ]);
    if (ridersRes.error) throw ridersRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const activeOrderCounts = new Map<string, number>();
    for (const row of ordersRes.data ?? []) {
      const riderId = row.rider_id as string;
      activeOrderCounts.set(riderId, (activeOrderCounts.get(riderId) ?? 0) + 1);
    }

    const riders: ActiveRider[] = ((ridersRes.data ?? []) as RiderRow[]).map((row) => {
      const availability = row.availability ?? [];
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        activeOrders: activeOrderCounts.get(row.user_id) ?? 0,
        zone: 'Kaup, Udupi',
        // NOTE: isOnline maps to is_active (account-active), NOT live presence.
        // AssignRiderRow filters on isOnline so its source is unchanged. The
        // real live online/offline signal is `presence` (riders.status) —
        // these two differ: a rider can have an active account (isOnline=true)
        // while being 'offline' right now (presence).
        isOnline: row.is_active,
        presence: row.status ?? 'offline',
        autoOnline: row.auto_online ?? false,
        availability,
        onScheduleNow: isWithinSchedule(availability),
      };
    });

    return NextResponse.json(riders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load riders.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
import { requireAdmin } from '@/lib/auth/requireAdmin';
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
  suspended_reason: string | null;
  suspended_at: string | null;
  last_location_update: string | null;
  current_lat: number | null;
  current_lng: number | null;
}

// Same freshness window the dispatch RPCs use (rider_dispatch_offers /
// accept_dispatch_offer, migration 107): an 'online' rider whose last
// position ping is older than this cannot receive or accept offers.
const FRESH_PING_MS = 3 * 60 * 1000;

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const now = Date.now();
    const [ridersRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from('riders')
        .select('id, user_id, name, phone, is_active, status, availability, auto_online, suspended_reason, suspended_at, last_location_update, current_lat, current_lng')
        .order('name'),
      supabaseAdmin.from('orders').select('rider_id, trip_id, id').not('rider_id', 'is', null).not('status', 'in', '(delivered,cancelled,failed)'),
    ]);
    if (ridersRes.error) throw ridersRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const activeOrderCounts = new Map<string, number>();
    // Live trips per rider: a multi-store trip counts once (same unit as
    // delivery_settings.max_active_trips_per_rider, migration 113).
    const activeTripScopes = new Map<string, Set<string>>();
    for (const row of ordersRes.data ?? []) {
      const riderId = row.rider_id as string;
      activeOrderCounts.set(riderId, (activeOrderCounts.get(riderId) ?? 0) + 1);
      const scopes = activeTripScopes.get(riderId) ?? new Set<string>();
      scopes.add((row.trip_id as string | null) ?? (row.id as string));
      activeTripScopes.set(riderId, scopes);
    }

    const riders: ActiveRider[] = ((ridersRes.data ?? []) as RiderRow[]).map((row) => {
      const availability = row.availability ?? [];
      const activeTrips = activeTripScopes.get(row.user_id)?.size ?? 0;
      // Heartbeat = the rider app's location ping (PATCH /rider/status, every
      // ~30-60 s while online, also from the background task). riders.status
      // stays 'online' when the app is killed, so freshness decides.
      const freshPing = !!row.last_location_update && now - new Date(row.last_location_update).getTime() <= FRESH_PING_MS;
      const liveStatus: ActiveRider['liveStatus'] = !row.is_active
        ? 'suspended'
        : activeTrips > 0
          ? 'on_delivery'
          : row.status !== 'offline' && row.status !== null && freshPing
            ? 'online'
            : 'offline';
      return {
        id: row.id,
        userId: row.user_id,
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
        // riders.status is only ever 'online'/'offline' (nothing writes
        // 'on_delivery'), so a live trip is what makes a rider on delivery.
        presence: activeTrips > 0 ? 'on_delivery' : (row.status ?? 'offline'),
        lastSeenAt: row.last_location_update,
        liveNow: row.is_active && row.status !== 'offline' && row.status !== null && freshPing,
        liveStatus,
        activeTrips,
        lastLat: row.current_lat,
        lastLng: row.current_lng,
        autoOnline: row.auto_online ?? false,
        availability,
        onScheduleNow: isWithinSchedule(availability),
        suspendedReason: row.is_active ? null : row.suspended_reason,
        suspendedAt: row.is_active ? null : row.suspended_at,
      };
    });

    return NextResponse.json(riders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load riders.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Live dispatch map data — service role (riders/orders/stores/addresses have
// no admin-usable public RLS read path, same rationale as app/api/riders and
// app/api/dispatch-board). Returns the online riders worth a dot (status
// 'online' with a fresh position ping, migration 113) plus every live order's
// store and customer pin, for the read-only Leaflet map on the dispatch page.
// Coordinates come from stores.lat/lng (migration 005) and addresses
// latitude/longitude (migration 082); orders themselves carry no GPS.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { toMapRiders, toMapOrders, type RiderRow, type OrderRow } from '@/lib/dispatchMap';

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  try {
    const [ridersRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from('riders')
        .select('id, name, status, current_lat, current_lng, last_location_update')
        .eq('status', 'online')
        .not('current_lat', 'is', null)
        .not('current_lng', 'is', null),
      supabaseAdmin
        .from('orders')
        .select('id, status, store:stores(name, lat, lng), address:addresses(latitude, longitude)')
        .in('status', ['placed', 'packed', 'out_for_delivery']),
    ]);
    if (ridersRes.error) throw ridersRes.error;
    if (ordersRes.error) throw ordersRes.error;

    const riders = toMapRiders((ridersRes.data ?? []) as unknown as RiderRow[], Date.now());
    const orders = toMapOrders((ordersRes.data ?? []) as unknown as OrderRow[]);

    return NextResponse.json({ riders, orders }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (err) {
    console.error('Dispatch map failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load the live map.' }, { status: 500 });
  }
}

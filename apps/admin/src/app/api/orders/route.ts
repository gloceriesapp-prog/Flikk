// Cross-app order monitor's real data (OrdersTable.tsx) — service role,
// same rationale as every other route here: orders has no public RLS read
// policy admin can use (orders_customer_read/orders_store_owner_read/
// orders_rider_read are all scoped to one caller, admin is none of them).
//
// Latest 200 orders — specs/05-platform/realtime.md's own warning against
// pulling the whole table applies once volume grows past this; revisit
// with real pagination when that's an actual problem, not before.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Order, OrderStatus } from '@/lib/types';

const STATUS_TIMESTAMP_COLUMN: Record<OrderStatus, string> = {
  placed: 'placed_at',
  packed: 'packed_at',
  out_for_delivery: 'picked_up_at',
  delivered: 'delivered_at',
  cancelled: 'placed_at',
};

interface OrderRow {
  id: string;
  store_id: string;
  status: OrderStatus;
  total: number;
  commission_amount: number;
  rider_id: string | null;
  placed_at: string;
  packed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  stores: { name: string; zones: { name: string } | null } | null;
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id, store_id, status, total, commission_amount, rider_id, placed_at, packed_at, picked_up_at, delivered_at, stores(name, zones(name))')
      .order('placed_at', { ascending: false })
      .limit(200);
    if (error) throw error;

    const now = Date.now();
    const orders: Order[] = ((data ?? []) as unknown as OrderRow[]).map((row) => {
      const statusColumn = STATUS_TIMESTAMP_COLUMN[row.status] as keyof OrderRow;
      const statusChangedAt = (row[statusColumn] as string | null) ?? row.placed_at;

      return {
        id: row.id,
        storeName: row.stores?.name ?? 'Unknown store',
        storeId: row.store_id,
        zone: row.stores?.zones?.name ?? '',
        placedAt: row.placed_at,
        amount: Number(row.total),
        status: row.status,
        riderId: row.rider_id,
        minutesSinceStatusChange: Math.round((now - new Date(statusChangedAt).getTime()) / 60000),
        commissionAmount: Number(row.commission_amount),
      };
    });

    return NextResponse.json(orders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not load orders.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

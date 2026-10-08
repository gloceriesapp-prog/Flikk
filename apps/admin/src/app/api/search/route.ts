// Sidebar search: orders (order number, order/trip id, customer name or
// phone — the same matching as the Orders page search), customers (name or
// phone) and stores (name, owner name or phone). Five of each, linked to
// their detail pages.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireStoreAdmin } from '@/features/store-management/adminGate';
import { buildOrderQuery, mapOrderRow, parseOrderFilters, searchCustomerIds, type OrderListRow } from '@/lib/orders/orderQuery';

export interface SearchResult {
  orders: { id: string; label: string; detail: string }[];
  customers: { id: string; label: string; detail: string }[];
  stores: { id: string; label: string; detail: string }[];
}

const LIMIT = 5;

export async function GET(request: Request) {
  const unauthorized = await requireStoreAdmin();
  if (unauthorized) return unauthorized;
  // Same sanitising as the Orders search: PostgREST filter characters are
  // stripped so a query can never add its own conditions to an or().
  const filters = parseOrderFilters(new URL(request.url).searchParams);
  const q = filters.q;
  const empty: SearchResult = { orders: [], customers: [], stores: [] };
  if (q.length < 2) return NextResponse.json(empty);
  try {
    const customerIds = await searchCustomerIds(q);
    const [orders, customers, stores] = await Promise.all([
      buildOrderQuery(filters, customerIds).limit(LIMIT),
      q.length >= 3
        ? supabaseAdmin.from('users').select('id, name, phone').eq('role', 'customer').or(`name.ilike.%${q}%,phone.ilike.%${q}%`).order('created_at', { ascending: false }).limit(LIMIT)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from('stores').select('id, name, owner_name, phone, district').or(`name.ilike.%${q}%,owner_name.ilike.%${q}%,phone.ilike.%${q}%`).order('name').limit(LIMIT),
    ]);
    if (orders.error) throw orders.error;
    if (customers.error) throw customers.error;
    if (stores.error) throw stores.error;
    const body: SearchResult = {
      orders: ((orders.data ?? []) as unknown as OrderListRow[]).map((row) => {
        const order = mapOrderRow(row);
        return { id: order.id, label: `#${order.orderNumber}`, detail: `${order.storeName} · ${order.status.replace(/_/g, ' ')}` };
      }),
      customers: ((customers.data ?? []) as { id: string; name: string | null; phone: string | null }[]).map((row) => ({
        id: row.id, label: row.name?.trim() || 'Unnamed customer', detail: row.phone ?? '',
      })),
      stores: ((stores.data ?? []) as { id: string; name: string; owner_name: string | null; phone: string | null; district: string | null }[]).map((row) => ({
        id: row.id, label: row.name, detail: [row.owner_name, row.district].filter(Boolean).join(' · '),
      })),
    };
    return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
  }
}

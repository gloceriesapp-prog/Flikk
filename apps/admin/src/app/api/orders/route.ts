// Cross-app order monitor's real data — service role, same rationale as every
// other route here: orders has no public RLS read policy admin can use
// (orders_customer_read/orders_store_owner_read/orders_rider_read are all
// scoped to one caller, admin is none of them).
//
// Three shapes, one set of filters (lib/orders/orderQuery.ts: status incl.
// failed/cancelled/'active', placed-at date range in IST, store, trip,
// unassigned, and a search over order number / order or trip id / customer
// name or phone):
// - ?paged=1&page=N&pageSize=M  -> OrderPage (server-side pagination + total)
// - ?format=csv                  -> CSV of the whole filtered list (capped)
// - no flag                      -> the latest 200 matching orders as a plain
//                                   array (Overview, Revenue, Zones and the
//                                   sidebar badge read this shape)

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import {
  buildOrderQuery, loadCustomers, mapOrderRow, ordersToCsv, parseOrderFilters, searchCustomerIds,
  type OrderListRow,
} from '@/lib/orders/orderQuery';
import type { OrderPage } from '@/lib/types';

const CSV_ROW_CAP = 10_000;
const CSV_CHUNK = 1000;

export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const filters = parseOrderFilters(params);

  try {
    const customerIds = filters.q ? await searchCustomerIds(filters.q) : [];
    const baseQuery = (count?: 'exact') => buildOrderQuery(filters, customerIds, count);

    if (params.get('format') === 'csv') {
      const rows: OrderListRow[] = [];
      for (let offset = 0; offset < CSV_ROW_CAP; offset += CSV_CHUNK) {
        const { data, error } = await baseQuery().range(offset, offset + CSV_CHUNK - 1);
        if (error) throw error;
        rows.push(...((data ?? []) as unknown as OrderListRow[]));
        if (!data || data.length < CSV_CHUNK) break;
      }
      const customers = await loadCustomers(rows);
      const csv = ordersToCsv(rows.map((row) => mapOrderRow(row, customers)));
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="orders-${stamp}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (params.get('paged') === '1') {
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get('pageSize') ?? '20', 10) || 20));
      const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
      const { data, error, count } = await baseQuery('exact').range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      const rows = (data ?? []) as unknown as OrderListRow[];
      const customers = await loadCustomers(rows);
      const body: OrderPage = { orders: rows.map((row) => mapOrderRow(row, customers)), total: count ?? rows.length, page, pageSize };
      return NextResponse.json(body);
    }

    const { data, error } = await baseQuery().limit(200);
    if (error) throw error;
    const rows = (data ?? []) as unknown as OrderListRow[];
    return NextResponse.json(rows.map((row) => mapOrderRow(row)));
  } catch (err) {
    console.error('Order list failed', { code: (err as { code?: string } | null)?.code });
    return NextResponse.json({ error: 'Could not load orders.' }, { status: 500 });
  }
}

// Server-side order list filters for GET /api/orders (paged JSON and CSV).
// Server-only: uses the service-role client for the customer search lookup.
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Order, OrderStatus } from '@/lib/types';
import { isUuid } from './adminActor';

export const ORDER_STATUSES: OrderStatus[] = ['placed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'failed'];
export type OrderStatusFilter = OrderStatus | 'all' | 'active';

export interface OrderFilters {
  status: OrderStatusFilter;
  // Inclusive IST calendar days (YYYY-MM-DD) on placed_at.
  from: string | null;
  to: string | null;
  storeId: string | null;
  tripId: string | null;
  unassigned: boolean;
  q: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function parseOrderFilters(params: URLSearchParams): OrderFilters {
  const status = params.get('status') ?? 'all';
  const from = params.get('from');
  const to = params.get('to');
  return {
    status: (['all', 'active', ...ORDER_STATUSES] as string[]).includes(status) ? (status as OrderStatusFilter) : 'all',
    from: from && DAY.test(from) ? from : null,
    to: to && DAY.test(to) ? to : null,
    storeId: isUuid(params.get('storeId')) ? params.get('storeId') : null,
    tripId: isUuid(params.get('tripId')) ? params.get('tripId') : null,
    unassigned: params.get('unassigned') === '1',
    // PostgREST filter syntax characters are stripped so a search can never
    // add its own conditions to the or() below.
    q: (params.get('q') ?? '').replace(/[^\p{L}\p{N} +@._-]/gu, '').trim().slice(0, 60),
  };
}

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export const ORDER_LIST_SELECT =
  'id, order_number, store_id, customer_id, status, total, commission_amount, rider_id, trip_id, payment_method, refund_status, cancel_reason, cancelled_by, placed_at, packed_at, picked_up_at, delivered_at, stores(name, zones(name))';

// Customers matching a name/phone search, resolved first so the order query
// can filter on customer_id (orders has no customer name column).
export async function searchCustomerIds(q: string): Promise<string[]> {
  if (q.length < 3) return [];
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('role', 'customer')
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => row.id as string);
}

// The filtered, newest-first order list query (paged JSON, CSV and the legacy array).
export function buildOrderQuery(filters: OrderFilters, customerIds: string[], count?: 'exact') {
  let q = supabaseAdmin.from('orders').select(ORDER_LIST_SELECT, count ? { count } : undefined);
  if (filters.status === 'active') q = q.in('status', ['placed', 'packed', 'out_for_delivery']);
  else if (filters.status !== 'all') q = q.eq('status', filters.status);
  if (filters.from) q = q.gte('placed_at', `${filters.from}T00:00:00+05:30`);
  if (filters.to) q = q.lt('placed_at', `${nextDay(filters.to)}T00:00:00+05:30`);
  if (filters.storeId) q = q.eq('store_id', filters.storeId);
  if (filters.tripId) q = q.eq('trip_id', filters.tripId);
  if (filters.unassigned) q = q.is('rider_id', null);
  if (filters.q) {
    if (isUuid(filters.q)) {
      q = q.or(`id.eq.${filters.q},trip_id.eq.${filters.q}`);
    } else {
      const clauses = [`order_number.ilike.%${filters.q}%`];
      if (customerIds.length) clauses.push(`customer_id.in.(${customerIds.join(',')})`);
      q = q.or(clauses.join(','));
    }
  }
  return q.order('placed_at', { ascending: false }).order('id', { ascending: false });
}

const STATUS_TIMESTAMP_COLUMN: Record<OrderStatus, keyof OrderListRow> = {
  placed: 'placed_at',
  packed: 'packed_at',
  out_for_delivery: 'picked_up_at',
  delivered: 'delivered_at',
  cancelled: 'placed_at',
  failed: 'picked_up_at',
};

export interface OrderListRow {
  id: string;
  order_number: string | null;
  store_id: string;
  customer_id: string;
  status: OrderStatus;
  total: number | string;
  commission_amount: number | string;
  rider_id: string | null;
  trip_id: string | null;
  payment_method: string | null;
  refund_status: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  placed_at: string;
  packed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  stores: { name: string; zones: { name: string } | null } | null;
}

export function mapOrderRow(row: OrderListRow, customers: Map<string, { name: string | null; phone: string | null }> = new Map(), now = Date.now()): Order {
  const statusChangedAt = (row[STATUS_TIMESTAMP_COLUMN[row.status]] as string | null) ?? row.placed_at;
  const customer = customers.get(row.customer_id);
  return {
    id: row.id,
    orderNumber: row.order_number ?? row.id.slice(0, 8).toUpperCase(),
    storeName: row.stores?.name ?? 'Unknown store',
    storeId: row.store_id,
    zone: row.stores?.zones?.name ?? '',
    placedAt: row.placed_at,
    amount: Number(row.total),
    status: row.status,
    riderId: row.rider_id,
    tripId: row.trip_id,
    minutesSinceStatusChange: Math.round((now - new Date(statusChangedAt).getTime()) / 60000),
    commissionAmount: Number(row.commission_amount),
    paymentMethod: row.payment_method,
    refundStatus: row.refund_status,
    cancelReason: row.cancel_reason,
    cancelledBy: row.cancelled_by,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
  };
}

export async function loadCustomers(rows: { customer_id: string }[]) {
  const ids = [...new Set(rows.map((row) => row.customer_id))];
  if (ids.length === 0) return new Map<string, { name: string | null; phone: string | null }>();
  const { data, error } = await supabaseAdmin.from('users').select('id, name, phone').in('id', ids);
  if (error) throw error;
  return new Map((data ?? []).map((user) => [user.id as string, { name: user.name as string | null, phone: user.phone as string | null }]));
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Neutralise spreadsheet formulas and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function ordersToCsv(orders: Order[]): string {
  const header = ['Order number', 'Order id', 'Trip id', 'Placed at', 'Status', 'Store', 'Customer', 'Customer phone', 'Amount', 'Commission', 'Payment', 'Refund status', 'Rider user id', 'Cancelled by', 'Reason'];
  const lines = orders.map((o) => [
    o.orderNumber, o.id, o.tripId, o.placedAt, o.status, o.storeName, o.customerName, o.customerPhone, o.amount, o.commissionAmount,
    o.paymentMethod, o.refundStatus, o.riderId, o.cancelledBy, o.cancelReason,
  ].map(csvCell).join(','));
  return [header.map(csvCell).join(','), ...lines].join('\r\n') + '\r\n';
}

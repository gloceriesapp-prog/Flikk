// A2 — Cross-app order monitor. Backed by a Supabase Realtime subscription
// once wired (specs/05-platform/realtime.md — must not pull the full
// unfiltered orders table into the browser); OrdersTable's filter pills
// are the client-side half of that, the server-side filter/pagination is
// a data-layer concern for whenever this reads real data instead of
// PLACEHOLDER_ORDERS.

import { OrdersTable } from '@/components/dashboard/OrdersTable';

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold text-ink">Orders</h1>
        <p className="text-sm text-muted">Live status across every store in the zone.</p>
      </div>

      <OrdersTable />
    </div>
  );
}

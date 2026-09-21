// A2 — Cross-app order monitor. Backed by real data (GET /api/orders,
// service-role Supabase read — see that route's own note) and a real
// Supabase Realtime subscription (app/api/realtime's SSE relay ->
// useAdminRealtime, wired inside OrdersTable) so any order write from the
// customer, partner, or rider app refetches this table live, no manual
// reload. OrdersTable's filter pills are the client-side half of
// specs/05-platform/realtime.md's own scoping note; server-side
// filter/pagination is a data-layer concern for once order volume outgrows
// the current 200-row cap, not before.

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

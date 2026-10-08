// A2 — Cross-app order monitor: server-side filtered, paginated list with CSV
// export (OrdersTable -> GET /api/orders). Each row opens /orders/[id], the
// detail page with the admin actions (cancel, status, rider, delivery code).
// Live via Supabase Realtime (useAdminRealtime inside OrdersTable).

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

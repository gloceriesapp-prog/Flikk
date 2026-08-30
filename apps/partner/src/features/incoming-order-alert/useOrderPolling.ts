// The actual "does a store owner get alerted when someone orders"
// mechanism — no Supabase Realtime client exists in this app (it talks to
// the Express backend exclusively; the service-role Supabase client stays
// backend-only, see backend/src/db/supabase.ts's own note), so a polling
// loop against real GET /partner/orders is what stands in for it. Mounted
// once from IncomingOrderAlert (App.tsx's own already-gated "only once
// there's a real, approved session" block) — this hook owns the interval,
// useOrdersStore.loadOrders() owns the actual fetch + genuinely-new-order
// detection (see that store's own note on newlyArrivedOrderIds).

import { useEffect } from 'react';
import { useOrdersStore } from '../../store/useOrdersStore';

const POLL_INTERVAL_MS = 10_000;

export function useOrderPolling(): void {
  const loadOrders = useOrdersStore((state) => state.loadOrders);

  useEffect(() => {
    void loadOrders();
    const interval = setInterval(() => {
      void loadOrders();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadOrders]);
}

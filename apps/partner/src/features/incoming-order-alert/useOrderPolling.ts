// The actual "does a store owner get alerted when someone orders"
// mechanism — no Supabase Realtime client exists in this app (it talks to
// the Express backend exclusively; the service-role Supabase client stays
// backend-only, see backend/src/db/supabase.ts's own note), so a polling
// loop against real GET /partner/orders is what stands in for it. Mounted
// once from IncomingOrderAlert (App.tsx's own already-gated "only once
// there's a real, approved session" block) — this hook owns the interval,
// useOrdersStore.loadOrders() owns the actual fetch + genuinely-new-order
// detection (see that store's own note on newlyArrivedOrderIds).
//
// Short interval (3.5s), not realtime: adding a Supabase realtime client is a
// product decision this app hasn't taken (no @supabase/supabase-js, no anon
// key shipped — only EXPO_PUBLIC_API_URL). Until then this is the audit's
// named stopgap — a tight poll plus the app-root AppState refetch
// (features/foreground-refresh) so a returning owner sees new orders at once
// instead of up to a full tick later.

import { useEffect } from 'react';
import { useOrdersStore } from '../../store/useOrdersStore';

const POLL_INTERVAL_MS = 3_500;

export function useOrderPolling(): void {
  const loadOrders = useOrdersStore((state) => state.loadOrders);

  useEffect(() => {
    void loadOrders().catch(() => {});
    const interval = setInterval(() => {
      void loadOrders().catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadOrders]);
}

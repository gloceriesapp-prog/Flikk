// Single app-root AppState listener for return-to-foreground. On the
// background -> active transition, for a real approved session:
//   1. Refetch the order queue immediately (gated to a real approved session,
//      the only state that polls) so returning from background doesn't wait a
//      full poll tick regardless of which tab is focused.
//   2. Re-read the catalog and store profile, and mark the commission query
//      stale, so an admin-side change made while backgrounded (catalog price/
//      stock edit, product/profile-change approval, store suspension or
//      re-activation, commission change) is reflected at once — this app has
//      no realtime stream (see useOrderPolling.ts), so this plus the focused
//      poll (useFocusedPoll) is how those changes land without a manual pull.
//   3. Re-check push registration and un-dismiss the notifications-off banner,
//      so an owner who toggled notifications on/off in system settings while
//      backgrounded gets the current state.
// One listener, cleaned up — not per-screen.
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useCatalogStore } from '../../store/useCatalogStore';
import { useStoreProfileStore } from '../../store/useStoreProfileStore';
import { useNotificationStatusStore } from '../../store/useNotificationStatusStore';
import { COMMISSION_QUERY_KEY } from '../../api/payouts';
import { registerPushToken } from '../push-notifications/registerPushToken';

export function useForegroundRefresh(canLoadOrders: boolean, isLoggedIn: boolean): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (canLoadOrders) {
        void useOrdersStore.getState().loadOrders().catch(() => {});
        // Catalog + profile are fetch-on-focus only (no poll of their own),
        // so a change made while backgrounded would otherwise stay invisible
        // until the owner re-navigated to that screen. loadProfile also
        // carries suspension state; commission is a query, so invalidate it.
        void useCatalogStore.getState().loadProducts().catch(() => {});
        void useStoreProfileStore.getState().loadProfile().catch(() => {});
        void queryClient.invalidateQueries({ queryKey: COMMISSION_QUERY_KEY });
      }
      if (isLoggedIn) {
        // Re-detect a permission flipped in system settings; un-dismiss so a
        // still-off state reappears (see NotificationsOffBanner).
        useNotificationStatusStore.getState().resetDismissed();
        void registerPushToken();
      }
    });
    return () => sub.remove();
  }, [canLoadOrders, isLoggedIn, queryClient]);
}

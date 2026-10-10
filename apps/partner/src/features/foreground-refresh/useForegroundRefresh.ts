// Single app-root AppState listener for return-to-foreground. Two jobs on the
// background -> active transition:
//   1. Refetch the order queue immediately (gated to a real approved session,
//      the only state that polls) so returning from background doesn't wait a
//      full poll tick regardless of which tab is focused.
//   2. Re-check push registration and un-dismiss the notifications-off banner,
//      so an owner who toggled notifications on/off in system settings while
//      backgrounded gets the current state.
// One listener, cleaned up — not per-screen.
import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useNotificationStatusStore } from '../../store/useNotificationStatusStore';
import { registerPushToken } from '../push-notifications/registerPushToken';

export function useForegroundRefresh(canLoadOrders: boolean, isLoggedIn: boolean): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (canLoadOrders) void useOrdersStore.getState().loadOrders().catch(() => {});
      if (isLoggedIn) {
        // Re-detect a permission flipped in system settings; un-dismiss so a
        // still-off state reappears (see NotificationsOffBanner).
        useNotificationStatusStore.getState().resetDismissed();
        void registerPushToken();
      }
    });
    return () => sub.remove();
  }, [canLoadOrders, isLoggedIn]);
}

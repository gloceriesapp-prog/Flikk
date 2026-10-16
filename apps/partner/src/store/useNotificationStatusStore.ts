// Tracks the outcome of push-token registration so a backgrounded owner with
// notifications off gets an in-app warning instead of silently missing orders.
// registerPushToken.ts used to swallow every failure into an empty catch — the
// one case where push is the ONLY channel that reaches a shop owner who isn't
// looking at the app. Now each outcome is recorded here and surfaced by
// NotificationsOffBanner.
//
// 'unsupported' (simulator / missing EAS projectId in local dev) deliberately
// does NOT warn — it's a dev-only no-op, not a real "you turned notifications
// off" state a production owner can be in.
import { create } from 'zustand';
import { onSessionReset } from './sessionScope';

export type PushStatus = 'unknown' | 'ok' | 'denied' | 'error' | 'unsupported';

interface NotificationStatusState {
  status: PushStatus;
  // Dismissible-but-recurring: a dismiss hides the banner for now, but the
  // AppState 'active' handler clears it on the next resume so a still-off
  // permission reappears rather than being silenced forever.
  dismissed: boolean;
  setStatus: (status: PushStatus) => void;
  dismiss: () => void;
  resetDismissed: () => void;
}

// A foreground recheck of the same denied status must not reopen a popup.
// A genuine permission change resets dismissal for a future decision.
export const useNotificationStatusStore = create<NotificationStatusState>((set) => ({
  status: 'unknown',
  dismissed: false,
  setStatus: (status) => set(state => status === state.status ? state : { status, dismissed: false }),
  dismiss: () => set({ dismissed: true }),
  resetDismissed: () => set({ dismissed: false }),
}));

export function pushStatusWarns(status: PushStatus): boolean {
  return status === 'denied' || status === 'error';
}

onSessionReset(() => useNotificationStatusStore.setState({ status: "unknown", dismissed: false }));

// The OS-notification half of the alert — reaches a rider whose phone is
// locked, backgrounded, or who has this app swapped away, unlike the
// full-screen Modal (IncomingOrderAlert.tsx) which only ever shows while
// the app is actually in the foreground. A modal alone means a
// backgrounded app silently eats the assignment — this is the fix.
//
// Local, not push (scheduleNotificationAsync with trigger: null) — fired
// client-side the moment useRiderOrdersStore's own poll (real GET /rider/
// assignments) notices a brand-new real assignment, not from an actual
// server push. A real push (like apps/partner's own push-notifications
// feature) would reach a force-quit app; this local one only reaches an
// app still running in the background, same gap admin's own approval push
// doesn't have. Good enough at this scale, worth upgrading if missed
// assignments become a real problem.

import * as Notifications from 'expo-notifications';
import type { RiderOrder } from '../../data/mockOrders';

// Without this, a notification fired while the app is in the foreground
// (the common case — the rider has the app open on some tab when an order
// arrives) shows and plays nothing on some platform versions. This makes
// foreground notifications behave the same as backgrounded ones.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permissionRequested = false;

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (permissionRequested) return false;
  permissionRequested = true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function notifyIncomingOrder(order: RiderOrder): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New order request',
      body: `${order.orderNumber} · ${order.storeName} · ₹${order.payout}`,
      sound: true,
    },
    trigger: null,
  });
}

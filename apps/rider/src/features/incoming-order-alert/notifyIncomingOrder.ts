// The OS-notification half of the alert — reaches a rider whose phone is
// locked, backgrounded, or who has this app swapped away, unlike the
// full-screen Modal (IncomingOrderAlert.tsx) which only ever shows while
// the app is actually in the foreground. A modal alone means a
// backgrounded app silently eats the assignment — this is the fix.
//
// Local, not push (scheduleNotificationAsync with trigger: null) — there's
// no real backend to push from yet (data/mockOrders.ts's own note), so
// this fires immediately from local mock state instead.

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

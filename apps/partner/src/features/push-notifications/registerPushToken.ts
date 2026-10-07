// Requests notification permission, gets this device's Expo push token, and
// saves it to the backend (api/auth.ts's savePushToken). Called once per
// login from RootNavigator. Every failure path is caught and swallowed: a
// denied permission or a simulator with no push capability must never crash
// the app or block login — in-app polling still finds new orders while the
// app is open; push is what reaches a shop owner who isn't looking.
//
// Store builds always carry an EAS projectId (app.config.js refuses to build
// without one); only a local dev run can lack it, and then this no-ops.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { savePushToken } from '../../api/auth';
import { navigationRef } from '../../navigation/navigationRef';

// Android channels: importance and sound are fixed by the OS the first time a
// channel is created and can't be changed by later app versions — only the
// user can, in system settings. 'orders' is created loud from day one (heads-up
// banner, sound, vibration, shown on the lock screen) because a missed "New
// order" push means an auto-rejected order. The backend sends order pushes
// with channelId 'orders' (backend/src/lib/pushNotifications.ts ORDER_PUSH);
// everything else (approvals, earnings) uses 'default'.
async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'New orders',
    description: 'Alerts for new customer orders that need accepting.',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
  });
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Store updates',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return; // simulators/emulators have no push capability

    await ensureAndroidChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token);
  } catch {
    // Best-effort — see the note above on why this never throws.
  }
}

// Push tokens can rotate (app data cleared, FCM refresh). Re-register on
// rotation so the backend never keeps pushing to a dead token. Returns the
// unsubscribe for RootNavigator's effect cleanup.
export function watchPushTokenRotation(): () => void {
  const subscription = Notifications.addPushTokenListener(() => {
    void registerPushToken();
  });
  return () => subscription.remove();
}

// Tapping an order push opens that order (or the Orders list when the push
// carries no single order id, e.g. one leg of a multi-store trip). A tap that
// cold-starts the app arrives before the NavigationContainer is ready, so it
// is held and replayed from RootNavigator's onReady.
let pendingTap: Notifications.NotificationResponse | null = null;

function openFromTap(response: Notifications.NotificationResponse | null): void {
  const data = response?.notification.request.content.data as { type?: unknown; orderId?: unknown } | undefined;
  if (!data) return;
  if (!navigationRef.isReady()) {
    pendingTap = response;
    return;
  }
  pendingTap = null;
  if (typeof data.orderId === 'string') navigationRef.navigate('OrderDetail', { orderId: data.orderId });
  else if (data.type === 'new_order') navigationRef.navigate('Orders');
}

export function flushPendingNotificationTap(): void {
  if (pendingTap) openFromTap(pendingTap);
}

export function watchNotificationTaps(): () => void {
  void Notifications.getLastNotificationResponseAsync().then(openFromTap).catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(openFromTap);
  return () => subscription.remove();
}

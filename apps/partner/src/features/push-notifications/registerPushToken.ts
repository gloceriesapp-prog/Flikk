// Requests notification permission, gets this device's Expo push token, and
// saves it to the backend (api/auth.ts's savePushToken). Called once per
// login from RootNavigator, and re-run on every return-to-foreground (App.tsx's
// AppState handler) so a permission the owner toggled off in system settings is
// re-detected. Still never throws — a denied permission or a simulator with no
// push capability must not crash the app or block login — but the outcome is
// now recorded in useNotificationStatusStore so NotificationsOffBanner can warn
// a backgrounded owner whose only order channel (push) is off. In-app polling
// still finds new orders while the app is open; push is what reaches a shop
// owner who isn't looking.
//
// Store builds always carry an EAS projectId (app.config.js refuses to build
// without one); only a local dev run can lack it, and then this no-ops.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { savePushToken } from '../../api/auth';
import { navigationRef } from '../../navigation/navigationRef';
import { useNotificationStatusStore } from '../../store/useNotificationStatusStore';
import { isAdminBroadcast } from './adminBroadcast';

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
  const setStatus = useNotificationStatusStore.getState().setStatus;
  try {
    // Simulators/emulators and a local dev run without an EAS projectId have no
    // real push capability — 'unsupported', not a warning: a dev isn't an owner
    // who switched notifications off.
    if (!Device.isDevice) {
      setStatus('unsupported');
      return;
    }

    await ensureAndroidChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') {
      setStatus('denied');
      return;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      setStatus('unsupported');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token);
    setStatus('ok');
  } catch {
    // Best-effort — never throws (see the note above). The failure is recorded
    // so the owner gets an in-app warning instead of silent zero signal.
    setStatus('error');
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
  // An admin fleet broadcast (adminBroadcast.ts) carries no order/trip and has
  // no inbox to open — the OS already brought the app forward, so stop here
  // rather than falling through to an order route.
  if (isAdminBroadcast(data)) return;
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

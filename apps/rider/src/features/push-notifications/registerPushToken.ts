// Push registration and handling for the rider app.
//
// - registerPushToken: creates the Android channels, asks permission, saves
//   this device's Expo push token (POST /auth/push-token). Best-effort, never
//   throws: polling still works without push.
// - watchOfferPushes: a push that lands while the app is open triggers an
//   immediate offers/assignments refresh instead of waiting for the next poll.
// - watchNotificationTaps: a tap opens the right screen (offer → Home, where
//   the offer card is; assignment → that order), including a tap that cold-
//   starts the app before navigation is ready.
//
// Android channel importance and sound are fixed when a channel is first
// created and later app versions cannot change them, so 'offers' is created
// loud from day one: heads-up banner, sound, long vibration, visible on the
// lock screen. The backend sends offers and assignments with channelId
// 'offers' (backend/src/lib/pushNotifications.ts); everything else (approval,
// earnings, admin broadcasts) uses 'default'.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { savePushToken } from '../../api/auth';
import { navigationRef } from '../../navigation/navigationRef';
import { useRiderOrdersStore } from '../../store/useRiderOrdersStore';
import { parseRiderPush } from './offerPush';

async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('offers', {
    name: 'Delivery offers',
    description: 'New pickups near you and orders assigned to you.',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
    bypassDnd: false,
  });
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Account updates',
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
    if (!projectId) return; // no EAS project linked — polling still covers it

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token);
  } catch {
    // Best-effort — see the note above on why this never throws.
  }
}

function refreshFromPush(): void {
  const store = useRiderOrdersStore.getState();
  if (store.isOnline) void store.refreshOffers();
  store.syncNow();
}

let pendingTap: Notifications.NotificationResponse | null = null;

function openFromTap(response: Notifications.NotificationResponse | null): void {
  const push = parseRiderPush(response?.notification.request.content.data);
  if (!push) return;
  if (!navigationRef.isReady()) {
    pendingTap = response;
    return;
  }
  pendingTap = null;
  // The container also hosts the sign-in / onboarding / suspended screens;
  // only route into the app shell when it is the one mounted.
  if (!navigationRef.getRootState()?.routeNames.includes('Tabs')) return;
  refreshFromPush();
  if (push.type === 'assignment' && push.orderId) navigationRef.navigate('OrderDetail', { orderId: push.orderId });
  else navigationRef.navigate('Tabs');
}

// Called from NavigationContainer's onReady: replays a tap that arrived before
// navigation existed (the app was killed and the tap launched it).
export function flushPendingNotificationTap(): void {
  if (pendingTap) openFromTap(pendingTap);
}

export function watchNotificationTaps(): () => void {
  // Expo Go strips the notification-response APIs. Never throws.
  if (isRunningInExpoGo()) return () => {};
  try {
    void Notifications.getLastNotificationResponseAsync().then(openFromTap).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(openFromTap);
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

export function watchOfferPushes(): () => void {
  if (isRunningInExpoGo()) return () => {};
  try {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      if (parseRiderPush(notification.request.content.data)) refreshFromPush();
    });
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

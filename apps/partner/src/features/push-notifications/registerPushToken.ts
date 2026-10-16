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
import { isRunningInExpoGo } from 'expo';
import { savePushToken } from '../../api/auth';
import { apiRequest } from '../../api/client';
import { navigationRef } from '../../navigation/navigationRef';
import { useNotificationStatusStore } from '../../store/useNotificationStatusStore';
import { createNotificationTapRouter } from './notificationNavigation';
import { useAuthStore } from '../../store/useAuthStore';
import { getSessionEpoch, isCurrentSession, onSessionReset } from '../../store/sessionScope';
import { ensureNotificationPermission } from './notificationPermission';

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
    // Omit sound to use Android's system default. Expo treats any string
    // here as a bundled custom filename, including the word 'default'.
    vibrationPattern: [0, 400, 200, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableVibrate: true,
  });
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Store updates',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

type DeviceToken = Notifications.DevicePushToken;
type Registration = { epoch: number; pending: DeviceToken | null; lastDeviceKey: string | null; promise: Promise<void> };
let registration: Registration | null = null;
let savedToken: { epoch: number; token: string } | null = null;
let sendingToken: { epoch: number; token: string } | null = null;
let logout: { epoch: number; promise: Promise<void> } | null = null;
const deviceKey = (token: DeviceToken) => `${token.type}:${String(token.data)}`;
const currentAccount = (epoch: number) => isCurrentSession(epoch) && logout?.epoch !== epoch && !!useAuthStore.getState().accessToken;
onSessionReset(() => { registration = null; savedToken = null; sendingToken = null; });

async function registerOnce(epoch: number, devicePushToken?: DeviceToken): Promise<void> {
  const setStatus = (status: Parameters<ReturnType<typeof useNotificationStatusStore.getState>['setStatus']>[0]) => {
    if (currentAccount(epoch)) useNotificationStatusStore.getState().setStatus(status);
  };
  try {
    if (!currentAccount(epoch)) return;
    if (!Device.isDevice || isRunningInExpoGo()) { setStatus('unsupported'); return; }
    await ensureAndroidChannels();
    if (!currentAccount(epoch)) return;
    const { status } = await ensureNotificationPermission();
    if (!currentAccount(epoch)) return;
    if (status !== 'granted') { setStatus('denied'); return; }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) { setStatus('unsupported'); return; }
    // Passing the native event's token avoids reading it again. Some native
    // SDKs emit onNewToken on every read, which otherwise creates a loop.
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId, ...(devicePushToken ? { devicePushToken } : {}) });
    if (!currentAccount(epoch)) return;
    if (savedToken?.epoch !== epoch || savedToken.token !== token) {
      sendingToken = { epoch, token };
      await savePushToken(token);
      if (!currentAccount(epoch)) return;
      savedToken = { epoch, token };
    }
    setStatus('ok');
  } catch { setStatus('error'); }
}

// Stop new registrations, drain any POST already in flight, then remove the
// device before clearing credentials. A failed removal keeps the session so
// the owner can retry; it must never silently leave an old store subscribed.
export function logoutPartner(): Promise<void> {
  const epoch = getSessionEpoch();
  if (logout?.epoch === epoch) return logout.promise;
  if (!useAuthStore.getState().accessToken) return useAuthStore.getState().clear();
  const draining = registration?.epoch === epoch ? registration.promise : Promise.resolve();
  const token = sendingToken?.epoch === epoch ? sendingToken.token : savedToken?.epoch === epoch ? savedToken.token : undefined;
  const work = { epoch, promise: Promise.resolve() };
  logout = work;
  work.promise = Promise.resolve().then(async () => {
    await draining;
    if (!isCurrentSession(epoch)) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      await apiRequest('/auth/push-token', { method: 'DELETE', body: token ? { token } : {}, signal: controller.signal });
      if (isCurrentSession(epoch)) await useAuthStore.getState().clear();
    } catch (error) {
      if (isCurrentSession(epoch)) throw error;
    } finally { clearTimeout(timeout); }
  }).finally(() => { if (logout === work) logout = null; });
  return work.promise;
}

export function registerPushToken(devicePushToken?: DeviceToken): Promise<void> {
  const epoch = getSessionEpoch();
  if (!currentAccount(epoch)) return Promise.resolve();
  if (registration?.epoch === epoch) {
    // Keep the latest actual rotation while one registration is running.
    if (devicePushToken && deviceKey(devicePushToken) !== registration.lastDeviceKey) registration.pending = devicePushToken;
    return registration.promise;
  }
  const work: Registration = { epoch, pending: devicePushToken ?? null, lastDeviceKey: null, promise: Promise.resolve() };
  registration = work;
  // Defer execution until the shared promise is installed, including when
  // a native token callback is delivered synchronously during the first read.
  work.promise = Promise.resolve().then(async () => {
    let first = true;
    while (currentAccount(epoch) && (first || work.pending)) {
      first = false;
      const next = work.pending;
      work.pending = null;
      if (next) work.lastDeviceKey = deviceKey(next);
      await registerOnce(epoch, next ?? undefined);
    }
  }).finally(() => { if (registration === work) registration = null; });
  return work.promise;
}

export function watchPushTokenRotation(): () => void {
  if (isRunningInExpoGo()) return () => {};
  try {
    const epoch = getSessionEpoch();
    const subscription = Notifications.addPushTokenListener(token => {
      if (currentAccount(epoch)) void registerPushToken(token);
    });
    return () => subscription.remove();
  } catch { return () => {}; }
}

// Tapping an order push opens that order (or the Orders list when the push
// carries no single order id, e.g. one leg of a multi-store trip). A tap that
// cold-starts the app arrives before the NavigationContainer is ready, so it
// is held and replayed from RootNavigator's onReady.
const tapRouter = createNotificationTapRouter({
  canNavigate: () => {
    const auth = useAuthStore.getState();
    return navigationRef.isReady() && !!auth.accessToken && auth.isApproved && auth.hasStore && !auth.partnerSuspended;
  },
  openOrder: orderId => navigationRef.navigate('OrderDetail', { orderId }),
  openQueue: () => navigationRef.navigate('Orders'),
  clearLastResponse: () => { void Notifications.clearLastNotificationResponseAsync().catch(() => {}); },
});
onSessionReset(tapRouter.reset);
export const flushPendingNotificationTap = tapRouter.flush;

export function watchNotificationTaps(): () => void {
  // Same Expo-Go guard as watchPushTokenRotation — the notification-response
  // APIs are among the ones Expo Go strips out. Never throws.
  if (isRunningInExpoGo()) return () => {};
  try {
    const epoch = getSessionEpoch();
    const open = (response: Notifications.NotificationResponse | null) => { if (isCurrentSession(epoch)) tapRouter.open(response); };
    void Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  } catch {
    return () => {};
  }
}

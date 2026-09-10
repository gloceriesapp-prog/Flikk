// Requests notification permission, gets this device's Expo push token, and
// saves it to the backend (api/auth.ts's savePushToken) — the piece that
// makes backend/src/routes/admin.ts's PATCH /orders/:id/assign-rider able
// to reach this phone the instant a founder assigns a real order, not just
// this app's own 12s poll (useRiderOrdersStore.ts). Called once a rider is
// a real, approved account (RootNavigator's own gate) — no point
// registering a token before there's any assignment to be pushed about.
//
// Byte-for-byte the same shape as apps/partner and apps/customer's own
// copy of this file (CLAUDE.md's cross-app consistency rule) — every
// failure path is caught and swallowed, push is a nice-to-have on top of
// polling that already works, never a requirement to use the app.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { savePushToken } from '../../api/auth';

export async function registerPushToken(): Promise<void> {
  try {
    if (!Device.isDevice) return; // simulators/emulators have no push capability

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let status = existingStatus;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return; // no EAS project linked yet — the 12s poll still covers it

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token);
  } catch {
    // Best-effort — see the note above on why this never throws.
  }
}

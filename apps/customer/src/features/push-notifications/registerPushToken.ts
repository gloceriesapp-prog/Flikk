// Requests notification permission, gets this device's Expo push token, and
// saves it to the backend (api/auth.ts's savePushToken) — the piece that
// makes backend/src/routes/orders.ts's PATCH /:id/status able to reach this
// phone the instant a store packs the order or a rider picks it up, not
// just the in-app polling TrackOrderScreen already does. Called once per
// app session, right after RootNavigator confirms there's a live session —
// no point registering a token for a session that doesn't exist yet. Same
// shape as apps/partner and apps/rider's own copy of this file.
//
// getExpoPushTokenAsync needs an EAS projectId (app.config.js's
// extra.eas.projectId) once outside Expo Go's own managed flow. Every
// failure path here is caught and swallowed: a missing projectId, a denied
// permission, a simulator with no push capability at all should never
// crash the app or block checkout — push is a nice-to-have on top of the
// polling that already works, not a requirement to use the app.
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { savePushToken } from '../../api/auth';

// Without this, a push that arrives while the app is in the foreground (the
// common case — the customer has TrackOrderScreen open when the status
// changes) shows and plays nothing on some platform versions.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
    if (!projectId) return; // no EAS project linked — order status still visible via polling

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token);
  } catch {
    // Best-effort — see the note above on why this never throws.
  }
}

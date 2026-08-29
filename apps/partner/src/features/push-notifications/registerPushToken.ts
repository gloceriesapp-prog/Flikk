// Requests notification permission, gets this device's Expo push token, and
// saves it to the backend (api/auth.ts's savePushToken) — the piece that
// makes admin's approve action (apps/admin/src/app/api/approvals/*) able to
// actually reach this phone the instant a founder approves, not just the
// in-app polling WaitingApprovalScreen already does. Called once per app
// session, right after RootNavigator confirms there's a live session (see
// that file's own effect) — no point registering a token for a session
// that doesn't exist yet.
//
// getExpoPushTokenAsync needs an EAS projectId (app.config.js's
// extra.eas.projectId) once outside Expo Go's own managed flow — this repo
// hasn't run `eas init` yet, so that field doesn't exist. Every failure
// path here is caught and swallowed: a missing projectId, a denied
// permission, a simulator with no push capability at all should never
// crash the app or block login — push is a nice-to-have on top of the
// polling that already works, not a requirement to use the app.
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
    if (!projectId) {
      // No EAS project linked yet (`eas init` hasn't been run) — nothing
      // to register against. Approval still works via in-app polling.
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await savePushToken(token);
  } catch {
    // Best-effort — see the note above on why this never throws.
  }
}

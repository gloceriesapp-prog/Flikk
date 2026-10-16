import * as Notifications from 'expo-notifications';

interface PermissionSnapshot { status: string; canAskAgain?: boolean }

export function createNotificationPermissionGate(
  read: () => Promise<PermissionSnapshot>,
  request: () => Promise<PermissionSnapshot>,
) {
  let pending: Promise<PermissionSnapshot> | null = null;
  let prompted = false;
  return () => {
    if (pending) return pending;
    pending = (async () => {
      const permission = await read();
      // Ask automatically only before the first decision. A denial is
      // respected across launches by the OS; Settings is the recovery path.
      if (permission.status !== 'undetermined' || permission.canAskAgain === false || prompted) return permission;
      prompted = true;
      return request();
    })().finally(() => { pending = null; });
    return pending;
  };
}

export const ensureNotificationPermission = createNotificationPermissionGate(
  () => Notifications.getPermissionsAsync(),
  () => Notifications.requestPermissionsAsync(),
);

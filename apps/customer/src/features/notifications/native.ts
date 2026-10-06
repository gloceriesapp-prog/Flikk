import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../api/client';
import { API_BASE_URL } from '../../api/baseUrl';
import { useAuthStore } from '../../store/useAuthStore';
const INSTALLATION_KEY = 'customer.notification.installation';
const REVISION_KEY = 'customer.notification.revision';
let registered: {epoch:number;token:string}|null = null;
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> { const work = queue.catch(() => { }).then(action); queue = work; return work; }
export function nativeNotifications() { return isRunningInExpoGo() || !Device.isDevice ? Promise.resolve(null) : import('expo-notifications'); }
export async function notificationPermission(): Promise<string> {
    const native = await nativeNotifications();
    return native ? (await native.getPermissionsAsync()).status : 'unsupported';
}
async function revision() { const value = Math.max(Date.now(), Number(await AsyncStorage.getItem(REVISION_KEY) || 0) + 1); await AsyncStorage.setItem(REVISION_KEY, String(value)); return value; }
export async function registerNotifications(requestPermission = false): Promise<string> {
    const customerId = useAuthStore.getState().customerId;
    const epoch = useAuthStore.getState().sessionEpoch;
    const native = await nativeNotifications();
    if (!native)
        return 'unsupported';
    if (Platform.OS === 'android')
        await native.setNotificationChannelAsync('default', { name: 'Order updates', importance: native.AndroidImportance.DEFAULT });
    let permission = await native.getPermissionsAsync();
    if (requestPermission && permission.status !== 'granted' && permission.canAskAgain)
        permission = await native.requestPermissionsAsync();
    if (permission.status !== 'granted') {
        if (registered) detachNotifications();
        return permission.status;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId)
        throw new Error('Push notifications are not configured for this build.');
    const { data: token } = await native.getExpoPushTokenAsync({ projectId });
    await serialize(async () => {
        if (useAuthStore.getState().sessionEpoch !== epoch || !customerId)
            return;
        if (registered?.epoch === epoch && registered.token === token) return;
        let installationId = await AsyncStorage.getItem(INSTALLATION_KEY);
        if (!installationId) {
            installationId = (await apiRequest<{
                id: string;
            }>('/notifications/installation-id', {signal:AbortSignal.timeout(10000)})).id;
            await AsyncStorage.setItem(INSTALLATION_KEY, installationId);
        }
        if (useAuthStore.getState().sessionEpoch !== epoch)
            return;
        await apiRequest('/notifications/devices', { method: 'POST', body: { installation_id: installationId, token, revision: await revision() }, signal:AbortSignal.timeout(10000) });
        if (useAuthStore.getState().sessionEpoch === epoch) registered = {epoch,token};
    });
    return permission.status;
}
// Capture the departing session before auth publishes the next account.
// Owner + monotonic revision prevents an old logout from detaching a new login.
export function detachNotifications(): void {
    registered = null;
    const token = useAuthStore.getState().accessToken;
    if (!token)
        return;
    void serialize(async () => {
        const id = await AsyncStorage.getItem(INSTALLATION_KEY);
        if (!id)
            return;
        await fetch(`${API_BASE_URL}/notifications/devices/${id}?revision=${await revision()}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) });
    }).catch(() => { });
    void nativeNotifications().then(native => native?.dismissAllNotificationsAsync()).catch(() => { });
}
export function openNotificationSettings() { return Linking.openSettings(); }

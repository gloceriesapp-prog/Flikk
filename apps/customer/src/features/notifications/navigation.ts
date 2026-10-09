import { createNavigationContainerRef } from '@react-navigation/native';
import { Alert } from 'react-native';
import type { AppStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { fetchOrder } from '../../api/orders';
import { fetchTrip } from '../../api/trips';
import { ApiError } from '../../api/client';
import { markNotificationRead } from './api';
import { notificationDisposition, type CustomerNotificationTarget } from './target';
export const notificationNavigation = createNavigationContainerRef<AppStackParamList>();
let pending: CustomerNotificationTarget | null = null;
let opening = false;
const seen = new Set<string>();
export function queueOrderNotification(target: CustomerNotificationTarget, deduplicate = false) {
    if (deduplicate && seen.has(target.notification_id))
        return;
    if (deduplicate) {
        seen.add(target.notification_id);
        if (seen.size > 100)
            seen.delete(seen.values().next().value!);
    }
    pending = target;
    void flushOrderNotification();
}
export async function flushOrderNotification(): Promise<void> {
    const target = pending;
    const session = useAuthStore.getState();
    if (!target)
        return;
    const disposition = notificationDisposition(target, session.customerId, notificationNavigation.isReady());
    if (disposition === 'wait')
        return;
    if (disposition === 'discard') {
        pending = null;
        return;
    }
    if (opening)
        return;
    opening = true;
    try {
        if (target.type !== 'order') {
            await markNotificationRead(target.notification_id);
            if (useAuthStore.getState().sessionEpoch !== session.sessionEpoch || !notificationNavigation.isReady()) return;
            notificationNavigation.navigate('Notifications');
            if (pending === target) pending = null;
            return;
        }
        // The backend proves ownership; payload IDs alone are never authorization.
        const order = target.is_trip ? await fetchTrip(target.order_id) : await fetchOrder(target.order_id);
        if (useAuthStore.getState().sessionEpoch !== session.sessionEpoch || !notificationNavigation.isReady())
            return;
        notificationNavigation.navigate('TrackOrder', { orderId: target.order_id, isTrip: target.is_trip, paymentMethodLabel: ('payment_method' in order ? order.payment_method : order.orders?.[0]?.payment_method) === 'cod' ? 'Cash on delivery' : 'Online payment' });
        if (pending === target)
            pending = null;
        void markNotificationRead(target.notification_id).catch(() => { });
    }
    catch (error) {
        if (useAuthStore.getState().sessionEpoch !== session.sessionEpoch)
            return;
        if (error instanceof ApiError && [401, 403, 404, 410].includes(error.status)) {
            if (pending === target)
                pending = null;
            Alert.alert(target.type !== 'order' ? 'Update unavailable' : 'Order unavailable', target.type !== 'order' ? 'This update cannot be opened for this account.' : 'This order cannot be opened for this account.');
        }
        else
            Alert.alert(target.type !== 'order' ? 'Could not open update' : 'Could not open order', 'Check your connection and try again.', [{ text: 'Later' }, { text: 'Retry', onPress: () => void flushOrderNotification() }]);
    }
    finally {
        opening = false;
        if (pending && (pending !== target || useAuthStore.getState().sessionEpoch !== session.sessionEpoch)) void flushOrderNotification();
    }
}

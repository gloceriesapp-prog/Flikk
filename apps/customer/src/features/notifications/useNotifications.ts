import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { accountQueryClient } from '../account-session/accountCache';
import { nativeNotifications, registerNotifications } from './native';
import { queueOrderNotification, flushOrderNotification } from './navigation';
import { customerNotificationTarget } from './target';
export function useNotifications() {
    const customerId = useAuthStore(s => s.customerId);
    useEffect(() => { if (customerId)
        void registerNotifications().catch(() => { }); void flushOrderNotification(); }, [customerId]);
    useEffect(() => {
        let disposed = false;
        const cleanup: (() => void)[] = [];
        const activity = AppState.addEventListener('change', state => { if (state === 'active') {
            void flushOrderNotification();
            if (useAuthStore.getState().customerId)
                void registerNotifications().catch(() => { });
        } });
        cleanup.push(() => activity.remove());
        void nativeNotifications().then(async (native) => {
            if (!native || disposed)
                return;
            native.setNotificationHandler({ handleNotification: async (notification) => {
                    const target = customerNotificationTarget(notification.request.content.data);
                    const owned = !!target && target.customer_id === useAuthStore.getState().customerId;
                    return { shouldShowBanner: owned, shouldShowList: owned, shouldPlaySound: owned, shouldSetBadge: false };
                } });
            const accept = (response: import('expo-notifications').NotificationResponse) => {
                if (disposed || response.actionIdentifier !== native.DEFAULT_ACTION_IDENTIFIER)
                    return;
                const target = customerNotificationTarget(response.notification.request.content.data);
                if (target)
                    queueOrderNotification(target, true);
                void native.clearLastNotificationResponseAsync().catch(() => { });
            };
            const taps = native.addNotificationResponseReceivedListener(accept);
            cleanup.push(() => taps.remove());
            const received = native.addNotificationReceivedListener(() => { void accountQueryClient().invalidateQueries({ queryKey: ['notifications', useAuthStore.getState().customerId] }); });
            cleanup.push(() => received.remove());
            const rotated = native.addPushTokenListener(() => { void registerNotifications().catch(() => { }); });
            cleanup.push(() => rotated.remove());
            const response = await native.getLastNotificationResponseAsync();
            if (response)
                accept(response);
        }).catch(() => { });
        return () => { disposed = true; cleanup.forEach(stop => stop()); };
    }, []);
}

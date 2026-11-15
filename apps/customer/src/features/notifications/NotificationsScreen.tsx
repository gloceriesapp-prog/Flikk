import { ScreenSkeleton } from '../../components/loading/ScreenSkeleton';
import { PromotionalPreferencesCard } from './PromotionalPreferencesCard';
import { useCallback, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ScreenStatusBar as StatusBar } from '../../components/ScreenStatusBar';
import type { AppStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { ApiError } from '../../api/client';
import { fetchNotifications, markNotificationRead, type CustomerNotification } from './api';
import { notificationPermission, registerNotifications, openNotificationSettings } from './native';
import { queueOrderNotification } from './navigation';
import { AccountPageHeader } from '../../components/AccountPageHeader';

function NotificationRow({ item, onPress }: { item: CustomerNotification; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mb-3 rounded-[24px] border border-[#E6E8EC] bg-white p-5" accessibilityRole="button">
      <View className="flex-row items-center gap-2">
        {!item.read_at && <View className="h-2 w-2 rounded-full bg-[#155DFC]" />}
        <Text className={`flex-1 text-[16px] text-ink ${item.read_at ? 'font-semibold' : 'font-bold'}`}>{item.title}</Text>
      </View>
      <Text className="mt-2 text-[15px] leading-[22px] text-ink/70">{item.body}</Text>
      <Text className="mt-3 text-[13px] leading-5 text-ink/65">{new Date(item.created_at).toLocaleString()}</Text>
    </Pressable>
  );
}

export function NotificationsScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'Notifications'>) {
  const customerId = useAuthStore(s => s.customerId);
  const [permission, setPermission] = useState('loading');
  const [message, setMessage] = useState('');
  const [enabling, setEnabling] = useState(false);
  const query = useInfiniteQuery({
    queryKey: ['notifications', customerId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    getNextPageParam: page => page.next_cursor ?? undefined,
    enabled: !!customerId,
    retry: 1,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    let active = true;
    void notificationPermission().then(value => { if (active) setPermission(value); })
      .catch(() => { if (active) setPermission('unavailable'); });
    void refetch();
    return () => { active = false; };
  }, [refetch]));

  async function enable() {
    if (enabling) return;
    setEnabling(true);
    try {
      setMessage('');
      const result = await registerNotifications(true);
      setPermission(result);
      if (result === 'denied') await openNotificationSettings();
    } catch {
      setMessage('Could not enable notifications. Please try again.');
    } finally {
      setEnabling(false);
    }
  }
  const unavailable = query.error instanceof ApiError && [401, 403, 404, 410].includes(query.error.status);
  const items = unavailable ? [] : query.data?.pages.flatMap(page => page.items) ?? [];
  const permissionCopy = permission === 'granted'
    ? 'Push notifications are on.'
    : permission === 'unsupported'
      ? 'Push alerts need a native app build. Your updates still appear here.'
      : 'Enable push alerts to follow your deliveries.';

  return (
    <View className="flex-1 bg-[#F5F6F8] pt-safe">
      <StatusBar style="dark" />
      <AccountPageHeader title="Notifications" onBack={() => navigation.goBack()} />

      <FlatList
        ListHeaderComponent={
          <>
            <View className="mx-5 mb-4 rounded-[24px] border border-[#E6E8EC] bg-white p-5">
              <Text accessibilityRole="header" className="text-[17px] font-bold text-ink">Order updates</Text>
              <Text className="mt-2 text-[15px] leading-[22px] text-ink/70">{permissionCopy}</Text>
              {permission !== 'unsupported' && (
                <Pressable accessibilityRole="button" disabled={enabling} onPress={() => {
                  if (permission === 'granted') void openNotificationSettings().catch(() => setMessage('Could not open device settings.'));
                  else void enable();
                }} className="mt-3">
                  <Text className="text-[15px] font-semibold text-primary">
                    {enabling ? 'Enabling…' : permission === 'granted' ? 'Notification settings' : 'Enable notifications'}
                  </Text>
                </Pressable>
              )}
              {!!message && <Text className="mt-2 text-red-600">{message}</Text>}
            </View>
            {query.isError && (
              <Pressable onPress={() => void refetch()} className="mx-5 mb-3 rounded-xl bg-white p-4">
                <Text>{unavailable ? 'Notifications unavailable.' : 'Could not refresh updates.'} Tap to retry.</Text>
              </Pressable>
            )}
            <PromotionalPreferencesCard />
          </>
        }
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshing={query.isRefetching}
        onRefresh={() => void refetch()}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={query.isPending ? <ScreenSkeleton layout="list" label="Loading notifications" /> : (
          <Text className="p-8 text-center text-gray-500">Your order updates will appear here.</Text>
        )}
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator /> : null}
        renderItem={({ item }) => (
          <View className="mx-5"><NotificationRow item={item} onPress={() => {
            if (!customerId) return;
            const orderId = item.trip_id ?? item.order_id;
            // Team and area messages only mark their own inbox entry read.
            if (!orderId) {
              if (item.read_at) return;
              const epoch = useAuthStore.getState().sessionEpoch;
              void markNotificationRead(item.id).then(() => {
                if (useAuthStore.getState().sessionEpoch === epoch) return refetch();
              }).catch(() => { if (useAuthStore.getState().sessionEpoch === epoch) setMessage('Could not mark this update as read. Please try again.'); });
              return;
            }
            queueOrderNotification({ type: 'order', customer_id: customerId, notification_id: item.id,
              order_id: orderId, is_trip: !!item.trip_id });
          }} /></View>
        )}
      />
    </View>
  );
}

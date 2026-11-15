import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchOrderHistoryPage } from '../../api/orders';
import { usePrivateQueryScope } from '../../network/usePrivateQueryScope';
import type { AppStackParamList } from '../../navigation/types';
import { useFocusedPoll } from '../../features/foreground-refresh/useFocusedPoll';
import { useOrdersStore } from '../../store/useOrdersStore';
import { ORDER_HISTORY_FILTERS, ORDER_STATUS_LABELS, uniqueHistoryOrders } from './orderHistoryPresentation';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderHistory'>;
export function OrderHistoryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const lastQueueUpdate = useOrdersStore(state => state.lastUpdatedAt);
  const scope = usePrivateQueryScope();
  const focused = useIsFocused();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const status = route.params?.status ?? '';

  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 350);
    return () => clearTimeout(timer);
  }, [input]);

  const query = useInfiniteQuery({
    enabled: focused,
    queryKey: ['partner-order-history', scope, search, status],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchOrderHistoryPage({ cursor: pageParam, search, status }),
    getNextPageParam: page => page.nextCursor ?? undefined,
    staleTime: 30_000,
    retry: 1,
  });
  const rows = useMemo(() => uniqueHistoryOrders(query.data?.pages ?? []), [query.data]);
  const { refetch } = query;
  const refresh = useCallback(() => { void refetch(); }, [refetch]);
  const pullToRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);
  useFocusedPoll(refresh, 15_000);
  // The existing live queue signals also invalidate the complete order list.
  useEffect(() => { if (focused) refresh(); }, [focused, lastQueueUpdate, refresh]);

  return (
    <SafeAreaView className="flex-1 bg-[#F1F2F4]" edges={['top']}>
      <View className="gap-4 px-5 py-4">
        <View className="gap-1">
          <Text accessibilityRole="header" className="text-[22px] font-semibold text-ink">Orders</Text>
          <Text className="text-[13px] font-medium text-ink/60">Your store’s orders, all in one place</Text>
        </View>
        <TextInput accessibilityLabel="Search order number" placeholder="Search order number" placeholderTextColor="#9AA5A3" value={input} onChangeText={setInput} maxLength={80} autoCapitalize="none" autoCorrect={false} className="h-12 rounded-2xl border border-gray-200 bg-white px-4 text-[14px] font-medium text-ink" style={{ paddingVertical: 0, textAlignVertical: 'center' }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {ORDER_HISTORY_FILTERS.map(filter => (
            <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: status === (filter.status ?? '') }} onPress={() => navigation.setParams({ status: filter.status })} className={`rounded-full px-4 py-2 ${status === (filter.status ?? '') ? 'bg-primary' : 'bg-white'}`}>
              <Text className={`text-[13px] font-medium ${status === (filter.status ?? '') ? 'text-white' : 'text-ink'}`}>{filter.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {query.isError && <Pressable accessibilityRole="button" onPress={() => void query.refetch()}><Text className="font-medium text-danger">Could not refresh history. {rows.length ? 'Showing your last update. ' : ''}Tap to retry.</Text></Pressable>}
        {query.dataUpdatedAt > 0 && <Text className="text-[12px] font-medium text-ink/60">Updated {new Date(query.dataUpdatedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</Text>}
      </View>
      <FlatList
        data={rows}
        keyExtractor={row => row.id}
        refreshing={refreshing}
        onRefresh={pullToRefresh}
        initialNumToRender={10}
        windowSize={7}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 112, gap: 12 }}
        ListEmptyComponent={<Text className="py-12 text-center font-medium text-ink/60">{query.isPending ? 'Loading your orders…' : query.isError ? 'Reconnect to view your orders.' : search ? 'No orders match your search.' : status ? `No ${ORDER_STATUS_LABELS[status].toLowerCase()} orders yet.` : 'No orders yet.'}</Text>}
        renderItem={({ item: row }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('OrderDetail', { orderId: row.id })}
            className="gap-2 rounded-2xl bg-white p-4"
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-[15px] font-medium text-ink" numberOfLines={1}>{row.order_number}</Text>
              <Text className="text-[13px] font-medium text-ink/70">{ORDER_STATUS_LABELS[row.status]}</Text>
            </View>
            <Text className="text-[13px] font-medium text-ink/60">{new Date(row.placed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Text>
            <Text className="text-[16px] font-medium text-ink">₹{row.total.toFixed(2)}</Text>
          </Pressable>
        )}
        ListFooterComponent={query.hasNextPage ? <Pressable disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} className="rounded-2xl bg-white p-4"><Text className="text-center font-medium text-primary">{query.isFetchingNextPage ? 'Finding more orders…' : 'Show more orders'}</Text></Pressable> : null}
      />
      <BottomNavBar />
    </SafeAreaView>
  );
}

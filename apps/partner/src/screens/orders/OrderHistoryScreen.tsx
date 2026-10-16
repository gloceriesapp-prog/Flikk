import { BackIcon } from '../../components/PartnerIcons';
import { useEffect, useState } from 'react';

import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchOrderHistoryPage, type OrderSummary } from '../../api/orders';
import { usePrivateQueryScope } from '../../network/usePrivateQueryScope';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderHistory'>;
const filters: { label: string; value: NonNullable<AppStackParamList['OrderHistory']>['status'] }[] = [
  { label: 'All', value: undefined },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Delivery issues', value: 'failed' },
];

const STATUS_LABELS: Partial<Record<OrderSummary['status'], string>> = {
  delivered: 'Delivered', cancelled: 'Cancelled', failed: 'Delivery issue',
};

export function OrderHistoryScreen({ navigation, route }: Props) {
  const scope = usePrivateQueryScope();
  const focused = useIsFocused();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
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
  const rows = query.data?.pages.flatMap(page => page.items) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-[#F1F2F4]" edges={['top', 'bottom']}>
      <View className="gap-4 px-5 py-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to orders"
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Orders')}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <BackIcon size={22} />
          </Pressable>
          <Text accessibilityRole="header" className="flex-1 text-[20px] font-semibold text-ink">Order history</Text>
        </View>
        <TextInput accessibilityLabel="Search order number" placeholder="Search order number" placeholderTextColor="#9AA5A3" value={input} onChangeText={setInput} maxLength={80} autoCapitalize="none" autoCorrect={false} className="min-h-[48px] rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[14px] font-medium text-ink" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {filters.map(filter => (
            <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: status === (filter.value ?? '') }} onPress={() => navigation.setParams({ status: filter.value })} className={`rounded-full px-4 py-2 ${status === (filter.value ?? '') ? 'bg-primary' : 'bg-white'}`}>
              <Text className={`text-[13px] font-medium ${status === (filter.value ?? '') ? 'text-white' : 'text-ink'}`}>{filter.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {query.isError && <Pressable accessibilityRole="button" onPress={() => void query.refetch()}><Text className="font-medium text-danger">Could not refresh history. {rows.length ? 'Showing your last update. ' : ''}Tap to retry.</Text></Pressable>}
        {query.dataUpdatedAt > 0 && <Text className="text-[12px] font-medium text-ink/60">Updated {new Date(query.dataUpdatedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</Text>}
      </View>
      <FlatList
        data={rows}
        keyExtractor={row => row.id}
        initialNumToRender={10}
        windowSize={7}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
        ListEmptyComponent={<Text className="py-12 text-center font-medium text-ink/60">{query.isPending ? 'Finding your past orders…' : query.isError ? 'Reconnect to view your orders.' : 'No orders match your search.'}</Text>}
        renderItem={({ item: row }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('OrderDetail', { orderId: row.id })}
            className="gap-2 rounded-2xl bg-white p-4"
          >
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-[15px] font-medium text-ink" numberOfLines={1}>{row.order_number}</Text>
              <Text className="text-[13px] font-medium text-ink/70">{STATUS_LABELS[row.status] ?? row.status.replaceAll('_', ' ')}</Text>
            </View>
            <Text className="text-[13px] font-medium text-ink/60">{new Date(row.placed_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</Text>
            <Text className="text-[16px] font-medium text-ink">₹{row.total.toFixed(2)}</Text>
          </Pressable>
        )}
        ListFooterComponent={query.hasNextPage ? <Pressable disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} className="rounded-2xl bg-white p-4"><Text className="text-center font-medium text-primary">{query.isFetchingNextPage ? 'Finding more orders…' : 'Show more orders'}</Text></Pressable> : null}
      />
    </SafeAreaView>
  );
}

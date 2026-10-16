import { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchOrderHistoryPage } from '../../api/orders';
import { usePrivateQueryScope } from '../../network/usePrivateQueryScope';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderHistory'>;
const filters: { label: string; value: NonNullable<AppStackParamList['OrderHistory']>['status'] }[] = [{ label: 'All', value: undefined }, { label: 'Delivered', value: 'delivered' }, { label: 'Cancelled', value: 'cancelled' }, { label: 'Delivery issues', value: 'failed' }];
export function OrderHistoryScreen({ navigation, route }: Props) {
  const scope = usePrivateQueryScope();
  const focused = useIsFocused();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const status = route.params?.status ?? '';
  useEffect(() => { const timer = setTimeout(() => setSearch(input.trim()), 350); return () => clearTimeout(timer); }, [input]);
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
  return <SafeAreaView className="flex-1 bg-[#F1F2F4]" edges={['top', 'bottom']}>
    <View className="gap-4 px-5 py-4">
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()}><Text className="text-primary font-medium">Back to orders</Text></Pressable>
      <Text className="text-2xl font-semibold text-ink">Order history</Text>
      <TextInput accessibilityLabel="Search order number" placeholder="Search order number" value={input} onChangeText={setInput} maxLength={80} autoCapitalize="none" className="rounded-2xl bg-white px-4 py-3 text-ink" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {filters.map(filter => <Pressable key={filter.label} accessibilityRole="button" accessibilityState={{ selected: status === (filter.value ?? '') }} onPress={() => navigation.setParams({ status: filter.value })} className={`rounded-full px-4 py-2 ${status === (filter.value ?? '') ? 'bg-primary' : 'bg-white'}`}><Text className={status === (filter.value ?? '') ? 'text-white' : 'text-ink'}>{filter.label}</Text></Pressable>)}
      </ScrollView>
      {query.isError && <Pressable onPress={() => void query.refetch()}><Text className="text-danger font-medium">Could not refresh history. {rows.length ? 'Showing your last update. ' : ''}Tap to retry.</Text></Pressable>}
      {query.dataUpdatedAt > 0 && <Text className="text-xs text-ink/60">Updated {new Date(query.dataUpdatedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</Text>}
    </View>
    <FlatList
      data={rows}
      keyExtractor={row => row.id}
      initialNumToRender={10}
      windowSize={7}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
      ListEmptyComponent={<Text className="py-12 text-center text-ink/60 font-medium">{query.isPending ? 'Finding your past orders…' : query.isError ? 'Reconnect to view your orders.' : 'No orders match your search.'}</Text>}
      renderItem={({ item: row }) => <Pressable accessibilityRole="button" onPress={() => navigation.navigate('OrderDetail', { orderId: row.id })} className="gap-2 rounded-2xl bg-white p-4">
        <View className="flex-row justify-between"><Text className="font-semibold text-ink">#{row.order_number}</Text><Text className="text-ink/70">{row.status.replaceAll('_', ' ')}</Text></View>
        <Text className="text-ink/60">{new Date(row.placed_at).toLocaleString('en-IN')}</Text>
        <Text className="font-semibold text-ink">₹{row.total.toFixed(2)}</Text>
      </Pressable>}
      ListFooterComponent={query.hasNextPage ? <Pressable disabled={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} className="rounded-2xl bg-white p-4"><Text className="text-center font-semibold text-primary">{query.isFetchingNextPage ? 'Finding more orders…' : 'Show more orders'}</Text></Pressable> : null}
    />
  </SafeAreaView>;
}

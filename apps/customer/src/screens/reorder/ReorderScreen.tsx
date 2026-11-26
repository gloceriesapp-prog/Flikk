// Re-order tab (bottom nav): items from the customer's recent orders —
// delivered, on the way and scheduled — newest first, each with a Re-order
// button. The full order list (statuses, tracking, receipts) stays in
// Profile → Orders (PurchaseScreen).
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { fetchReorderItems } from '../../api/orders';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { ScreenStatusBar as StatusBar } from '../../components/ScreenStatusBar';
import { useAuthStore } from '../../store/useAuthStore';
import { useLocationStore } from '../../store/useLocationStore';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';
import { ReorderItemRow } from './ReorderItemRow';

type Props = NativeStackScreenProps<AppStackParamList, 'Reorder'>;

export function ReorderScreen({ navigation }: Props) {
  const customerId = useAuthStore((s) => s.customerId);
  const location = useLocationStore((s) => s.location);
  const items = useQuery({
    queryKey: ['home', 'reorder-items', customerId, location?.latitude, location?.longitude],
    queryFn: fetchReorderItems,
    enabled: !!customerId && !!location,
    staleTime: 60_000,
  });
  const products = items.data ?? [];
  const loading = !!customerId && !!location && items.isPending;

  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <View className="px-5 pb-4 pt-3">
        <Text accessibilityRole="header" className="text-[28px] font-bold tracking-tight text-ink">Buy again</Text>
        <Text className="mt-1 text-[16px] font-medium text-ink/55">Items from your recent orders</Text>
      </View>

      <FlashList
        data={products}
        keyExtractor={(product) => product.id}
        contentContainerStyle={{ paddingBottom: 140 }}
        ItemSeparatorComponent={() => <View className="mx-4 h-px" style={{ backgroundColor: colors.divider }} />}
        renderItem={({ item }) => <ReorderItemRow product={item} />}
        ListEmptyComponent={loading ? <ActivityIndicator className="py-16" color="#155DFC" /> : items.isError ? (
          <View className="items-center gap-3 py-16">
            <Text className="text-[16px] text-ink">Couldn’t load your recent items.</Text>
            <Pressable accessibilityRole="button" onPress={() => { void items.refetch(); }} hitSlop={10}><Text className="text-[16px] font-semibold text-[#155DFC]">Try again</Text></Pressable>
          </View>
        ) : (
          <View className="items-center px-8 py-20">
            <Text className="text-center text-[21px] font-bold text-ink">No recent items yet</Text>
            <Text className="mt-2 text-center text-[16px] font-medium leading-[23px] text-ink/55">Items you order will show up here, ready to order again.</Text>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Categories')}
              className="mt-7 min-h-[54px] items-center justify-center rounded-2xl px-8 active:opacity-85" style={{ backgroundColor: '#155DFC' }}>
              <Text className="text-[17px] font-semibold text-white">Browse categories</Text>
            </Pressable>
          </View>
        )}
      />

      <BottomNavBar />
    </View>
  );
}

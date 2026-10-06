import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import type { AppStackParamList } from '../../navigation/types';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { DeliveryDetailsSection } from '../track-order/sections/delivery-details/DeliveryDetailsSection';
import { useOrderSummary } from './useOrderSummary';
import { OrderSummaryItemRow } from './components/OrderSummaryItemRow';
import { OrderSummaryBillCard } from './components/OrderSummaryBillCard';
import { OrderSummaryDetailsCard } from './components/OrderSummaryDetailsCard';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderSummary'>;

export function OrderSummaryScreen({ navigation, route }: Props) {
  const { summary, isLoading, isError, refetch } = useOrderSummary(route.params.orderId, !!route.params.isTrip);
  const [refreshing, setRefreshing] = useState(false);
  const focused = useIsFocused();

  return (
    <View className="flex-1 bg-[#F5F7F8] pt-safe">
      {focused && <StatusBar style="dark" />}
      <View className="flex-row items-center px-5 pb-3 pt-2">
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} className="h-11 w-11 items-center justify-center rounded-full border border-ink/5 bg-white">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" className="flex-1 text-center text-[17px] font-semibold text-ink">Order summary</Text>
        <View className="w-11" />
      </View>
      {isLoading && !summary ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.success} /></View>
      ) : !summary ? (
        <View className="flex-1 items-center justify-center gap-3 px-8">
          <Text className="text-center text-[18px] font-bold text-ink">Couldn’t load your order</Text>
          <Text className="text-center text-[14px] text-ink/55">Please try again to see your order details.</Text>
          <Pressable onPress={() => void refetch()} accessibilityRole="button" className="rounded-xl bg-[#172B24] px-6 py-3"><Text className="font-semibold text-white">Try again</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={summary.items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderSummaryItemRow item={item} />}
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-safe-offset-6"
          contentInsetAdjustmentBehavior="never"
          ListHeaderComponent={
            <>
              {isError && <Text className="mx-5 mb-4 text-[12px] text-ink/55">Showing saved details. Pull down to refresh.</Text>}
              <View className="mx-5 rounded-t-3xl bg-white px-4 pb-1 pt-5"><Text accessibilityRole="header" className="text-[18px] font-bold text-ink">In your order</Text></View>
            </>
          }
          ListEmptyComponent={<View className="mx-5 bg-white p-5"><Text className="text-[13px] text-ink/55">Item details unavailable.</Text></View>}
          ListFooterComponent={
            <>
              <View className="mx-5 h-4 rounded-b-3xl bg-white" />
              <View className="mx-5 mt-4 gap-4">
                <OrderSummaryBillCard summary={summary} />
                <OrderSummaryDetailsCard summary={summary} />
                <DeliveryDetailsSection address={summary.address} />
              </View>
            </>
          }
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try { await refetch(); } finally { setRefreshing(false); }
          }}
        />
      )}
    </View>
  );
}

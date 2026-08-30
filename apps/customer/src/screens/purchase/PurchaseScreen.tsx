// "Purchase" tab (was "Order Again" in the bottom nav). Reached from
// BottomNavBar — see src/components/BottomNavBar/data.ts. BottomNavBar
// itself renders here too now (a sibling of the ScrollView, same pattern
// HomeScreen.tsx uses — floats fixed in place while the page scrolls
// underneath it), so the tab bar stays reachable from Purchase instead of
// only from Home; the "Purchase" header above stays exactly as it was.
//
// Real order history now — GET /orders (api/orders.ts), not the old
// LIVE_ORDER/PAST_ORDERS placeholder dataset. "Live" is any order not yet
// delivered/cancelled (placed/packed/out_for_delivery); everything else is
// "Past". Multiple live orders are possible in principle (nothing stops a
// customer placing a second order before the first is delivered) — shown
// as multiple Live Order cards, not just the first one, rather than
// silently hiding a real in-flight order.

import { useEffect } from 'react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { BottomNavBar } from '../../components/BottomNavBar/BottomNavBar';
import { colors } from '../../theme/tokens';
import { fetchMyOrders } from '../../api/orders';
import { mapApiOrder } from './data';
import { LiveOrderCard } from './components/LiveOrderCard';
import { PastOrderCard } from './components/PastOrderCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Purchase'>;

const FEATURE_IMAGE_URI = 'https://i.pinimg.com/1200x/a1/dc/37/a1dc376c96e834e7ae7baf401202b79a.jpg';

export function PurchaseScreen({ navigation }: Props) {
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => (await fetchMyOrders()).map(mapApiOrder),
  });

  // Purchase is reached repeatedly across a session (Home tab bar, after
  // checkout, etc.) — refetching on every focus keeps a live order's
  // status current without needing a polling interval on a screen that
  // isn't even open most of the time (TrackOrderScreen's own note on why
  // it polls instead — it's the screen actually being watched).
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => void refetch());
    return unsubscribe;
  }, [navigation, refetch]);

  const liveOrders = (orders ?? []).filter((o) => o.status === 'placed' || o.status === 'packed' || o.status === 'out_for_delivery');
  const pastOrders = (orders ?? []).filter((o) => o.status === 'delivered' || o.status === 'cancelled');
  const hasAnyOrder = liveOrders.length > 0 || pastOrders.length > 0;

  return (
    <View className="flex-1 bg-white pt-safe">
      {/* Same fix, same reason, as CategoriesScreen.tsx/CartScreen.tsx —
          HomeScreen sets the global StatusBar to "light" for its own dark
          header, which doesn't reset on navigation and leaves invisible
          white icons against this screen's white background. */}
      <StatusBar style="dark" />
      <View className="relative flex-row items-center px-5 pb-2 pt-2">
        <Pressable
          onPress={() => navigation.navigate('Home')}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center"
        >
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>

        <Text pointerEvents="none" className="absolute left-0 right-0 text-center text-xl font-semibold text-ink">
          Purchase
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : hasAnyOrder ? (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-6 pb-28 pt-3" showsVerticalScrollIndicator={false}>
          {liveOrders.length > 0 && (
            <>
              <Text className="text-lg font-semibold text-ink">Live Order</Text>
              {liveOrders.map((order) => (
                <LiveOrderCard
                  key={order.orderId}
                  order={order}
                  onTrackOrder={() => navigation.navigate('TrackOrder', { orderId: order.orderId, paymentMethodLabel: 'UPI' })}
                />
              ))}
            </>
          )}

          {pastOrders.length > 0 && (
            <View className="mt-3 gap-3">
              <Text className="text-lg font-medium text-ink">Past Orders</Text>
              {pastOrders.map((order) => (
                <PastOrderCard key={order.orderId} order={order} />
              ))}
            </View>
          )}

          <Text className="mt-4 px-2 text-center text-base font-semibold leading-6 text-gray-500">
            You&apos;re not just ordering. You&apos;re keeping{"\n"}
            local shops open. 🌾
          </Text>
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-between pb-28" showsVerticalScrollIndicator={false}>
          <View>
            <Image source={{ uri: FEATURE_IMAGE_URI }} className="aspect-[4/5] w-3/5 self-center" resizeMode="cover" />
            <Text className="mt-5 px-8 text-center text-lg font-bold text-ink">No orders yet.</Text>
            <Text className="mt-1 px-8 text-center text-sm font-medium text-ink/50">
              They&apos;ll show up here once you place your first one.
            </Text>
          </View>

          <Text className="px-6 text-left text-[25px] font-semibold leading-8 text-gray-500">
            You&apos;re not just ordering. You&apos;re keeping
            local shops open. 🌾
          </Text>
        </ScrollView>
      )}

      <BottomNavBar />
    </View>
  );
}

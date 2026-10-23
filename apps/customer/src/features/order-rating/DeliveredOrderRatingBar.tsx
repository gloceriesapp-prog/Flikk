import { useContext, useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery } from '@tanstack/react-query';
import Animated, { interpolate, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/useAuthStore';
import { purchaseHistoryOptions } from '../purchases/historyQuery';
import { groupOrdersByTrip } from '../../utils/tripLegs';
import { mapOrderGroup } from '../../screens/purchase/data';
import { COMPLETED_ORDER_PREVIEW_ID } from '../../screens/purchase/preview/completedOrder';
import { HomeNavigationProgressContext } from '../../navigation/home/HomeNavigationProgressContext';
import { useOrderRating } from './useOrderRating';
import { useOrderRatingPreview } from './preview';
import { RatingPromptArrow } from './components/RatingPromptArrow';
import type { AppStackParamList } from '../../navigation/types';

export function DeliveredOrderRatingBar({ onHeightChange, navigationBarHeight = 74 }: { onHeightChange?: (height: number) => void; navigationBarHeight?: number }) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const customerId = useAuthStore(s => s.customerId);
  const preview = useOrderRatingPreview(s => s.visible) && __DEV__;
  const { data } = useInfiniteQuery(purchaseHistoryOptions(customerId));
  const delivered = groupOrdersByTrip(data?.pages[0]?.items ?? []).map(mapOrderGroup)
    .filter(order => order.status === 'delivered')
    .sort((a, b) => Date.parse(b.deliveredAtIso ?? b.placedAtIso) - Date.parse(a.deliveredAtIso ?? a.placedAtIso))[0];
  const rating = useOrderRating(preview ? COMPLETED_ORDER_PREVIEW_ID : delivered?.orderId, preview || !!delivered, preview);
  const insets = useSafeAreaInsets();
  const localHidden = useSharedValue(0);
  const progress = useContext(HomeNavigationProgressContext) ?? localHidden;
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(progress.value, [0, 1], [0, navigationBarHeight]) }] }));
  useEffect(() => { if (!rating.visible) onHeightChange?.(0); }, [rating.visible, onHeightChange]);
  if (!rating.visible) return null;

  return (
    <Animated.View pointerEvents="box-none" style={[{ position: 'absolute', left: 16, right: 16,
      bottom: insets.bottom + (Platform.OS === 'android' ? 0 : -10) + navigationBarHeight + 2 }, slide]}>
      <Pressable onLayout={event => onHeightChange?.(event.nativeEvent.layout.height)}
        accessibilityRole="button" accessibilityLabel="Rate your delivered order"
        accessibilityHint={preview ? 'Open delivery and item ratings' : 'Open your purchases to rate this order'}
        onPress={() => preview ? navigation.navigate('OrderRating', { previewOnly: true }) : navigation.navigate('Purchase')}
        className="min-h-[64px] w-full flex-row items-center gap-3 self-center rounded-[18px] border border-[#DCE3ED] bg-white px-3.5 py-2.5 active:bg-[#F8FAFF]" style={{ maxWidth: 488 }}>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[14px] font-semibold leading-[19px] text-[#1D2939]">How was your order?</Text>
          <Text numberOfLines={1} className="mt-0.5 text-[11.5px] font-medium leading-4 text-[#667085]">Rate your delivery &amp; items</Text>
        </View>
        <View className="min-h-10 flex-row items-center gap-0.5 rounded-xl bg-[#EEF3FF] pl-2.5 pr-1.5">
          <Text className="text-[12px] font-semibold text-[#155DFC]">Rate order</Text>
          <RatingPromptArrow color="#155DFC" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

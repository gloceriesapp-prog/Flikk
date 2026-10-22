import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/AppIcon';
import type { AppStackParamList } from '../../../navigation/types';
import { createCompletedOrderPreview } from '../../../screens/purchase/preview/completedOrder';
import { DeliveryRatingSection } from '../components/DeliveryRatingSection';
import { OrderItemRatingRow } from '../components/OrderItemRatingRow';
import { useOrderRatingPreview } from '../preview';
import { ORDER_RATING_CONTENT_STYLE } from '../layout';

type Props = NativeStackScreenProps<AppStackParamList, 'OrderRating'>;

// Design preview only. Per-item/rider feedback is intentionally kept separate
// from the existing overall store review API, which cannot save these fields.
export function OrderRatingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [order] = useState(createCompletedOrderPreview);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const items = order.items.map((item, index) => ({ item, key: `${item.productId}-${index}` }));
  const canSubmit = deliveryRating > 0 && items.every(({ key }) => (itemRatings[key] ?? 0) > 0);

  function submitPreview() {
    if (!canSubmit || submitted) return;
    useOrderRatingPreview.getState().rate(deliveryRating);
    setSubmitted(true);
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <View className="min-h-[52px] flex-row items-center gap-1" style={ORDER_RATING_CONTENT_STYLE}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()}
          className="-ml-3 h-11 w-11 items-center justify-center rounded-full active:bg-[#F5F5F5]">
          <AppIcon icon={ArrowLeft02Icon} size={23} color="#171717" />
        </Pressable>
        <Text numberOfLines={1} className="text-[14px] font-medium leading-5 text-[#525252]">Order feedback</Text>
      </View>

      {submitted ? (
        <View className="flex-1 items-center justify-center gap-2" style={ORDER_RATING_CONTENT_STYLE}>
          <Text className="text-center text-xl font-semibold text-[#111111]">Thanks for your feedback</Text>
          <Text className="text-center text-sm text-[#737373]">You’ve completed the sample rating.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[ORDER_RATING_CONTENT_STYLE, { paddingTop: 16, paddingBottom: 20 }]}>
          <Text accessibilityRole="header" className="text-[28px] font-semibold leading-[34px] tracking-[-0.7px] text-[#111111]">How did we do?</Text>
          <Text className="mb-3 mt-2 text-[14px] font-medium leading-[21px] text-[#737373]">Your feedback makes the next order better.</Text>
          <DeliveryRatingSection riderName="Koushik" rating={deliveryRating} onRate={setDeliveryRating} />
          <Text accessibilityRole="header" className="mt-6 text-[19px] font-semibold leading-[25px] tracking-[-0.3px] text-[#111111]">And your groceries?</Text>
          <Text className="mb-1 mt-1 text-[13px] font-medium leading-[19px] text-[#737373]">Rate each item in your order.</Text>
          <View>
            {items.map(({ item, key }) => <OrderItemRatingRow key={key} item={item} rating={itemRatings[key] ?? 0}
              onRate={value => setItemRatings(previous => ({ ...previous, [key]: value }))} />)}
          </View>
        </ScrollView>
      )}

      <View className="border-t border-[#F0F0F0] bg-white pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
        <View style={ORDER_RATING_CONTENT_STYLE}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !submitted && !canSubmit }}
          disabled={!submitted && !canSubmit} onPress={submitted ? () => navigation.goBack() : submitPreview}
          className={`min-h-[52px] items-center justify-center rounded-[14px] ${submitted || canSubmit ? 'bg-[#111111]' : 'bg-[#E7E7EA]'}`}>
          <Text className={`text-[16px] font-semibold ${submitted || canSubmit ? 'text-white' : 'text-[#8C8C93]'}`}>{submitted ? 'Done' : 'Send feedback'}</Text>
        </Pressable>
        </View>
      </View>
    </View>
  );
}

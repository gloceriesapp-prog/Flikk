import { Pressable, Text, View } from 'react-native';
import { AppImage } from '../AppImage';
import { CartArrowRight } from './CartArrowRight';
import { PLACEHOLDER_IMAGE_URI } from '../../theme/placeholderImage';
import { CART_BAR_HEIGHT } from './layout';

type Preview = { id: string; imageUrl?: string };
interface Props {
  width: number;
  quantity: number;
  itemTotal: number;
  previews: Preview[];
  deliveryThreshold?: number;
  onPress: () => void;
}
const BLUE = '#155DFC';

export function CartBarCard({ width, quantity, itemTotal, previews, deliveryThreshold, onPress }: Props) {
  const hasDeliveryGoal = deliveryThreshold !== undefined && Number.isFinite(deliveryThreshold) && deliveryThreshold >= 0;
  const remaining = hasDeliveryGoal ? Math.max(0, deliveryThreshold - itemTotal) : 0;
  const progress = hasDeliveryGoal ? deliveryThreshold === 0 ? 1 : Math.min(1, Math.max(0, itemTotal / deliveryThreshold)) : 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`View cart, ${quantity} ${quantity === 1 ? 'item' : 'items'}`}
      onPress={onPress} className="active:opacity-95" style={{ width, maxWidth: '100%', height: CART_BAR_HEIGHT }}>
      <View className="absolute inset-x-0 top-0 overflow-hidden rounded-t-[24px]" style={{ height: 50, backgroundColor: '#DCE8FF' }}>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {[0, 1, 2, 3].map(index => <View key={index} style={{ position: 'absolute', top: -22, right: 12 + index * 24,
            width: 12, height: 100, backgroundColor: '#155DFC', opacity: 0.04, transform: [{ rotate: '25deg' }] }} />)}
        </View>
        <View className="items-center justify-center px-3" style={{ height: 26 }}>
          <Text numberOfLines={1} className="text-center font-semibold" style={{ color: '#144FCC', fontSize: 12.5, lineHeight: 17 }}>
            ₹0 delivery on your first 3 orders
          </Text>
        </View>
      </View>
      <View className="absolute inset-x-0 bottom-0 h-16 flex-row items-center gap-2 rounded-full border border-[#E7EBF2] bg-white px-2.5"
        style={{ shadowColor: '#142647', shadowOpacity: 0.10, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
        <View className="flex-row items-center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {(previews.length ? previews : [{ id: 'cart-placeholder' }]).slice(0, 3).map((item, index) => (
            <View key={item.id} className="h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-[#F3F6FC]"
              style={{ marginLeft: index === 0 ? 0 : -24, zIndex: index + 1 }}>
              <AppImage recyclingKey={item.id} source={{ uri: item.imageUrl || PLACEHOLDER_IMAGE_URI }}
                style={{ width: '100%', height: '100%' }} resizeMode="cover" transition={0} accessible={false} />
            </View>
          ))}
        </View>
        <View className="min-w-0 flex-1 py-1">
          <Text numberOfLines={1} className="text-[14px] font-bold leading-[17px] text-[#171E25]">
            {hasDeliveryGoal ? remaining > 0 ? 'Unlock free delivery' : 'Free delivery unlocked' : 'Your cart is ready'}
          </Text>
          <Text numberOfLines={1} className="mt-0.5 text-[12px] leading-[16px] text-[#6B7280]">
            {quantity} {quantity === 1 ? 'item' : 'items'}
          </Text>
          {hasDeliveryGoal && <View accessible accessibilityRole="progressbar" accessibilityLabel="Free delivery progress"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-[#E6EDFB]">
            <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: BLUE }} />
          </View>}
        </View>
        <View className="h-11 flex-row items-center justify-center gap-2 rounded-full px-3.5" style={{ backgroundColor: BLUE }}>
          <Text className="text-[15px] font-semibold text-white">Cart</Text>
          <CartArrowRight />
        </View>
      </View>
    </Pressable>
  );
}

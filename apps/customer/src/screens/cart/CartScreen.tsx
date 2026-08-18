// Reached from CartBar's "View cart" tap (see components/CartBar/CartBar.tsx)
// or the bottom nav. "Checkout" navigates to screens/checkout/CheckoutScreen
// — the actual "place order" action lives there, not here; this screen is
// just the editable item list + fee breakdown.

import { ArrowLeft01Icon, ShoppingBasket03Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import {
  CART_DELIVERY_FEE,
  CART_HANDLING_FEE,
  selectCartGrandTotal,
  selectCartTotalPrice,
  selectCartTotalQuantity,
  useCartStore,
} from '../../store/useCartStore';
import { CartItemRow } from './components/CartItemRow';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const itemTotal = useCartStore(selectCartTotalPrice);
  const grandTotal = useCartStore(selectCartGrandTotal);

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center px-2 pb-2 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-semibold text-ink">My Cart</Text>
        {/* Spacer matching the back button's width — keeps the title
            genuinely centered in the row, not just centered in the
            remaining space next to the button. */}
        <View className="h-11 w-11" />
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-1 px-10">
          <AppIcon icon={ShoppingBasket03Icon} size={40} color={`${colors.ink}`} />
          <Text className="text-center text-lg font-semibold text-ink">Your cart is empty</Text>
          <Text className="text-center text-base text-ink/50">Add something from a store to see it here.</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" contentContainerClassName="px-5 pb-40">
            {items.map((item) => (
              <CartItemRow key={item.id} item={item} />
            ))}
          </ScrollView>

          <View className="gap-4 border-t border-mist px-5 pb-safe-offset-4 pt-4">
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-medium text-ink/60">
                  Item total ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
                </Text>
                <Text className="text-lg font-semibold text-ink">₹{itemTotal}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-medium text-ink/60">Delivery fee</Text>
                <Text className="text-lg font-semibold text-ink">₹{CART_DELIVERY_FEE}</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-medium text-ink/60">Handling fee</Text>
                <Text className="text-lg font-semibold text-ink">₹{CART_HANDLING_FEE}</Text>
              </View>

              <View className="mt-1 flex-row items-center justify-between border-t border-mist pt-2">
                <Text className="text-xl font-semibold text-ink">To pay</Text>
                <Text className="text-xl font-semibold text-ink">₹{grandTotal}</Text>
              </View>
            </View>

            <Pressable onPress={() => navigation.navigate('Checkout')} className="items-center rounded-3xl bg-black py-4">
              <Text className="text-xl font-semibold text-white">Checkout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

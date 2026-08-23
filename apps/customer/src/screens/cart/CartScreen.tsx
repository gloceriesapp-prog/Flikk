// Reached from CartBar's "View cart" tap (see components/CartBar/CartBar.tsx)
// or the bottom nav. "Checkout" navigates to screens/checkout/CheckoutScreen
// — the actual "place order" action lives there, not here; this screen is
// just the editable item list + fee breakdown.
//
// Page bg is #FAFAFA with four white rounded cards stacked on it (items,
// DeliveryTipCard, YouMayAlsoLikeRow, BillDetailsCard) rather than one
// continuous white sheet — matches the reference. Items card: "N items"
// header + a dashed divider, then one CartItemRow per item.
//
// Tip selection is lifted up here (not local to DeliveryTipCard) because
// BillDetailsCard's "Delivery Partner Tip" line and its own To Pay total
// both need to read it.

import { useState } from 'react';
import { ArrowLeft01Icon, ShoppingBasket03Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { selectCartTotalPrice, selectCartTotalQuantity, useCartStore } from '../../store/useCartStore';
import { CartItemRow } from './components/CartItemRow';
import { DeliveryTipCard, type TipSelection } from './components/DeliveryTipCard';
import { YouMayAlsoLikeRow } from './components/YouMayAlsoLikeRow';
import { BillDetailsCard } from './components/BillDetailsCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props) {
  const items = useCartStore((state) => state.items);
  const totalQuantity = useCartStore(selectCartTotalQuantity);
  const itemTotal = useCartStore(selectCartTotalPrice);

  const [tip, setTip] = useState<TipSelection>(null);

  const originalItemTotal = items.some((item) => item.originalPrice)
    ? items.reduce((sum, item) => sum + (item.originalPrice ?? item.price) * item.quantity, 0)
    : null;

  return (
    <View className="flex-1 bg-[#FAFAFA]">
      {/* App.tsx sets a global dark-icon StatusBar, but a screen further
          back in the stack (e.g. HomeScreen) can leave it set to "light" —
          expo-status-bar's style is a single global native call, not scoped
          per screen, so it doesn't reset itself on navigation. This local
          override guarantees dark (visible) icons on Cart's white header
          regardless of what the previous screen left it as. */}
      <StatusBar style="dark" />

      <View className="bg-white pt-safe">
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
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-1 px-10">
          <AppIcon icon={ShoppingBasket03Icon} size={40} color={`${colors.ink}`} />
          <Text className="text-center text-lg font-semibold text-ink">Your cart is empty</Text>
          <Text className="text-center text-base text-ink/50">Add something from a store to see it here.</Text>
        </View>
      ) : (
        <>
          <ScrollView className="flex-1" contentContainerClassName="gap-3 px-4 pb-40 pt-1">
            <View className="rounded-2xl bg-white px-4 py-4">
              <Text className="text-sm font-semibold text-ink/50">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
              </Text>
              <View className="my-3 h-px border-t border-dashed border-mist" />

              {items.map((item, index) => (
                <View key={item.id}>
                  <CartItemRow item={item} />
                  {index < items.length - 1 && <View className="h-px bg-mist" />}
                </View>
              ))}
            </View>

            <DeliveryTipCard selectedTip={tip} onSelectTip={setTip} />
            <YouMayAlsoLikeRow />
            <BillDetailsCard itemTotal={itemTotal} originalItemTotal={originalItemTotal} tip={tip} />
          </ScrollView>

          <View className="border-t border-mist px-5 pb-safe-offset-4 pt-4">
            <Pressable onPress={() => navigation.navigate('Checkout')} className="items-center rounded-3xl bg-black py-4">
              <Text className="text-xl font-semibold text-white">Checkout</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

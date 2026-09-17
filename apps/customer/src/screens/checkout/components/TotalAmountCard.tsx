// Collapsible "Total Amount" row, sitting right below CheckoutHeader —
// same reference layout as a real checkout's amount summary (rounded pill,
// chevron, right-aligned total), but this app's own white/black palette
// instead of the reference's blue-on-lavender, per an explicit ask. Tapping
// the chevron expands the real cart contents (name/qty/line total) below
// it, in a Modal + slide sheet — so a customer about to pay ₹X can verify
// exactly what they're paying for without leaving this screen.

import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ArrowDown01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import type { CartItem } from '../../../store/useCartStore';

interface Props {
  items: CartItem[];
  totalPrice: number;
}

export function TotalAmountCard({ items, totalPrice }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setExpanded(true)}
        className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-3.5"
      >
        <View className="flex-row items-center gap-1.5">
          <Text className="text-[15px] font-semibold text-ink">Total Amount</Text>
          <AppIcon icon={ArrowDown01Icon} size={16} color={colors.ink} />
        </View>
        <Text className="text-[15px] font-semibold text-ink">₹{totalPrice}</Text>
      </Pressable>

      <Modal visible={expanded} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setExpanded(false)}>
        <Pressable className="flex-1 justify-end bg-black/50" onPress={() => setExpanded(false)}>
          <Pressable onPress={(e) => e.stopPropagation()} className="rounded-t-3xl bg-white px-5 pb-safe-offset-4 pt-4" style={{ maxHeight: '75%' }}>
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-medium text-ink">Order Summary</Text>
              <Pressable onPress={() => setExpanded(false)} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                <AppIcon icon={Cancel01Icon} size={16} color={colors.ink} />
              </Pressable>
            </View>

            <ScrollView contentContainerClassName="gap-3 pb-2" showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <View key={item.id} className="flex-row items-center justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-[14.5px] font-medium text-ink" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="mt-0.5 text-[12.5px] text-ink/50">
                      {item.quantity} × ₹{item.price}
                      {item.weight ? ` · ${item.weight}` : ''}
                    </Text>
                  </View>
                  <Text className="text-[14.5px] font-semibold text-ink">₹{item.price * item.quantity}</Text>
                </View>
              ))}
            </ScrollView>

            <View className="mt-3 flex-row items-center justify-between border-t border-mist pt-3">
              <Text className="text-[15px] font-semibold text-ink">Total</Text>
              <Text className="text-[15px] font-semibold text-ink">₹{totalPrice}</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

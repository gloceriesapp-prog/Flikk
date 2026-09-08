// Sits right below YouMayAlsoLikeRow, above BillDetailsCard — a progress
// bar toward FREE_DELIVERY_THRESHOLD (same constant BillDetailsCard reads
// to actually waive CART_DELIVERY_FEE, so this card's claim and the real
// fee waiver can't drift apart). Below threshold: "Add ₹X more" with a
// partial-fill bar; at/above it: unlocked state, full bar, tick icon.

import { CheckmarkCircle02Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { FREE_DELIVERY_THRESHOLD } from '../../../store/useCartStore';

const ACCENT = '#155DFC';
const SUCCESS = '#2E9E77';

interface Props {
  itemTotal: number;
}

export function FreeDeliveryProgressCard({ itemTotal }: Props) {
  const isUnlocked = itemTotal >= FREE_DELIVERY_THRESHOLD;
  const remaining = FREE_DELIVERY_THRESHOLD - itemTotal;
  const progress = Math.min(1, itemTotal / FREE_DELIVERY_THRESHOLD);
  const tint = isUnlocked ? SUCCESS : ACCENT;

  return (
    <View className="gap-2.5 rounded-2xl bg-white px-4 py-4">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}14` }}>
          <AppIcon icon={isUnlocked ? CheckmarkCircle02Icon : DeliveryTruck01Icon} size={16} color={tint} />
        </View>
        <Text className="flex-1 text-[13.5px] font-semibold text-ink">
          {isUnlocked ? 'You unlocked free delivery' : `Add ₹${remaining} more for free delivery`}
        </Text>
      </View>

      <View className="h-2 overflow-hidden rounded-full bg-gray-100">
        <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: tint }} />
      </View>
    </View>
  );
}

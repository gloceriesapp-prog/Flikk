// Sits right below YouMayAlsoLikeRow, above BillDetailsCard — a progress
// bar toward the real freeDeliveryThreshold (useDeliverySettings, same
// admin-editable setting BillDetailsCard reads to actually waive the fee,
// so this card's claim and the real waiver can't drift apart). Below
// threshold: "Add ₹X more" with a partial-fill bar; at/above it: unlocked
// state, full bar, tick icon. Currently unused (hidden per an explicit
// ask, CartScreen.tsx's own note) — kept compiling, not deleted.

import { CheckmarkCircle02Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { DEFAULT_DELIVERY_SETTINGS, useDeliverySettings } from '../../../api/deliverySettings';

const ACCENT = '#155DFC';
const SUCCESS = '#2E9E77';

interface Props {
  itemTotal: number;
}

export function FreeDeliveryProgressCard({ itemTotal }: Props) {
  const { data: deliverySettings = DEFAULT_DELIVERY_SETTINGS } = useDeliverySettings();
  const { freeDeliveryThreshold } = deliverySettings;
  const isUnlocked = itemTotal >= freeDeliveryThreshold;
  const remaining = freeDeliveryThreshold - itemTotal;
  const progress = Math.min(1, itemTotal / freeDeliveryThreshold);
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

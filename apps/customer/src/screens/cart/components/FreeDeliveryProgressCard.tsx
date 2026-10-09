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
  if (!deliverySettings.freeDeliveryEnabled || !Number.isFinite(freeDeliveryThreshold) || freeDeliveryThreshold < 0 || !Number.isFinite(itemTotal)) return null;
  const isUnlocked = itemTotal >= freeDeliveryThreshold;
  const remaining = freeDeliveryThreshold - itemTotal;
  const progress = freeDeliveryThreshold === 0 ? 1 : Math.min(1, Math.max(0, itemTotal) / freeDeliveryThreshold);
  const tint = isUnlocked ? SUCCESS : ACCENT;

  return (
    <View className="gap-2.5 rounded-2xl bg-white px-4 py-4">
      <View className="flex-row items-center gap-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}14` }}>
          <AppIcon icon={isUnlocked ? CheckmarkCircle02Icon : DeliveryTruck01Icon} size={16} color={tint} />
        </View>
        <Text className="flex-1 text-[13.5px] font-semibold text-ink">
          {isUnlocked ? 'You unlocked free delivery' : `Add ₹${remaining.toFixed(2)} more for free delivery`}
        </Text>
      </View>

      <Text className="text-[11px] text-ink/50">Handling fees still apply.</Text>
      <View className="h-2 overflow-hidden rounded-full bg-gray-100">
        <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: tint }} />
      </View>
    </View>
  );
}

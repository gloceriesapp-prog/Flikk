// Demo "active order" card for the Purchase tab — no real order history
// exists yet (this screen's own "No orders yet." placeholder below is the
// honest default), so this is a stand-in showing what the card looks like
// once a real one exists. Tapping "Track Order" opens the same
// screens/track-order/TrackOrderScreen.tsx as everywhere else.

import { ArrowRight01Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  onTrackOrder: () => void;
}

export function OnTheWayCard({ onTrackOrder }: Props) {
  return (
    <View className="mx-6 gap-4 rounded-3xl border border-lime-deep/20 bg-lime-soft p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 rounded-full bg-lime-deep px-3 py-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-white" />
          <Text className="text-xs font-bold text-white">On the way</Text>
        </View>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
          <AppIcon icon={DeliveryTruck01Icon} size={17} color={colors.limeDeep} />
        </View>
      </View>

      <View>
        <Text className="text-base font-extrabold text-ink">Your order is out for delivery</Text>
        <Text className="mt-0.5 text-sm font-medium text-ink/60">Arriving today, in about 20 minutes.</Text>
      </View>

      <Pressable onPress={onTrackOrder} className="flex-row items-center justify-center gap-1.5 rounded-2xl bg-ink py-3.5">
        <Text className="text-sm font-bold text-white">Track Order</Text>
        <AppIcon icon={ArrowRight01Icon} size={15} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

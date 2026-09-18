// Sits directly below OrderInfoCard (the estimate card) — per an explicit
// ask, a real standalone card explaining the cancel window rather than a
// bare button floating with no context. Only ever rendered while the
// order is genuinely still cancellable (TrackOrderScreen.tsx's own
// isCancellable, mirroring backend/src/lib/orderStateMachine.ts's real
// isValidTransition) — this card and DeliveryRiderCard are mutually
// exclusive by construction, never a manual "hide the other one" flag.

import { InformationCircleIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  onPress: () => void;
}

export function CancelOrderCard({ onPress }: Props) {
  return (
    <View className="w-full gap-4 rounded-3xl bg-[#FFFFFF] p-5">
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-[15px] font-semibold text-ink">Changed your mind? </Text>
          <Text className="mt-1.5 text-[14.5px] font-medium leading-5 text-ink/70">
            You can still cancel, the store hasn&apos;t handed this off to a rider yet. Paid online? Your refund
            starts the moment you confirm.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onPress}
        className="w-full flex-row items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3.5 active:bg-gray-50"
      >
        <AppIcon icon={Cancel01Icon} size={16} color={colors.danger} />
        <Text className="text-[14.5px] font-semibold text-danger">Cancel Order</Text>
      </Pressable>
    </View>
  );
}

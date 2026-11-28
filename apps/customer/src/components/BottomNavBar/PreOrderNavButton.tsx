import { Pressable, Text, View } from 'react-native';
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../AppIcon';
import { actionColors } from '../../theme/tokens';

// Width of the Pre-order tab on both platforms (iOS and Android bars).
export const PRE_ORDER_WIDTH = 72;

// "Pre / order ↗" tab beside the nav bar: brand blue, white text on two
// short lines so the tab stays narrow. It runs into the screen's right edge,
// so only its left end is rounded.
export function PreOrderNavButton({ height, onPress }: { height: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Pre-order" onPress={onPress}
      className="flex-row items-center justify-center gap-0.5 pl-1 active:opacity-85"
      style={{ width: PRE_ORDER_WIDTH, height, borderTopLeftRadius: height / 2, borderBottomLeftRadius: height / 2, backgroundColor: actionColors.fill }}>
      <View className="items-start">
        <Text className="text-[13px] font-bold leading-[15px] text-white" numberOfLines={1}>Pre</Text>
        <Text className="text-[13px] font-bold leading-[15px] text-white" numberOfLines={1}>order</Text>
      </View>
      <AppIcon icon={ArrowUpRight01Icon} size={13} color="#FFFFFF" strokeWidth={2.6} />
    </Pressable>
  );
}

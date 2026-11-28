import { Pressable, Text } from 'react-native';
import { ArrowUpRight01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../AppIcon';
import { actionColors } from '../../theme/tokens';

// "Pre-order ↗" tab beside the nav bar: brand blue, white text. It runs
// into the screen's right edge, so only its left end is rounded.
export function PreOrderNavButton({ width, height, onPress }: { width: number; height: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Pre-order" onPress={onPress}
      className="flex-row items-center justify-center gap-1 pr-1 active:opacity-85"
      style={{ width, height, borderTopLeftRadius: height / 2, borderBottomLeftRadius: height / 2, backgroundColor: actionColors.fill }}>
      <Text className="text-[14px] font-bold text-white" numberOfLines={1}>Pre-order</Text>
      <AppIcon icon={ArrowUpRight01Icon} size={14} color="#FFFFFF" strokeWidth={2.6} />
    </Pressable>
  );
}

import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconlyArrowLeft } from '../../../../components/icons/iconly';

// Round back button floating over full-bleed page artwork, inset below the
// status bar, so Back stays reachable while the page scrolls.
export function FloatingBackButton({ onPress, label = 'Back to Home' }: { onPress: () => void; label?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 20, zIndex: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="h-11 w-11 items-center justify-center rounded-full border border-[#E8EBEF] bg-white active:bg-[#F3F4F6]" hitSlop={8}>
        <IconlyArrowLeft size={24} color="#101C10" />
      </Pressable>
    </View>
  );
}

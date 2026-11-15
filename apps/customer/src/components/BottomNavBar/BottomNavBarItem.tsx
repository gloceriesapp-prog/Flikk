import { Platform, Pressable, Text, View } from 'react-native';
import { IconlyCategory, IconlyHome, IconlyStore, type IconlyIconProps } from '../icons/iconly';
import { IconlyDeliveryBox } from '../icons/IconlyDeliveryBox';
import type { NavTab } from './data';

interface Props {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}

// Per-tab Iconly glyph from components/icons/iconly.tsx (outline when
// inactive, filled when active).
const ICON_BY_TAB: Record<string, React.ComponentType<IconlyIconProps>> = {
  home: IconlyHome,
  'order-again': IconlyDeliveryBox,
  categories: IconlyCategory,
  store: IconlyStore,
};

export function BottomNavBarItem({ tab, isActive, onPress }: Props) {
  const Icon = ICON_BY_TAB[tab.id] ?? IconlyHome;
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: isActive }} className="items-center px-0">
      {/* Android: drop the gray active pill per request — the active state
          still reads via the filled icon + bold label. iOS keeps the pill. */}
      <View
        className={`items-center justify-center gap-1 rounded-full h-[54px] w-[72px] ${isActive && Platform.OS !== 'android'
            ? 'bg-black/10'
            : 'bg-transparent'
          }`}
      >
        <Icon size={20} color={isActive ? '#101C10' : '#101C1099'} active={isActive} />

        <Text
          className={`text-[11px] ${isActive ? 'font-bold text-ink' : 'font-medium text-ink/60'
            }`}
        >
          {tab.label}
        </Text>
      </View>
    </Pressable>
  );
}
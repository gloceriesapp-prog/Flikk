import { Pressable, Text, View } from 'react-native';
import { IconlyHome, IconlyBag, IconlyCategory, type IconlyIconProps } from '../icons/iconly';
import type { NavTab } from './data';

interface Props {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}

// Per-tab Iconly glyph (outline when inactive, filled when active). Store has
// no dedicated glyph yet — reuses Category as a placeholder (added later).
const ICON_BY_TAB: Record<string, React.ComponentType<IconlyIconProps>> = {
  home: IconlyHome,
  'order-again': IconlyBag,
  categories: IconlyCategory,
  store: IconlyCategory,
};

export function BottomNavBarItem({ tab, isActive, onPress }: Props) {
  const Icon = ICON_BY_TAB[tab.id] ?? IconlyHome;
  return (
    <Pressable onPress={onPress} className="items-center px-0">
      <View
        className={`items-center justify-center gap-1 rounded-full ${isActive
            ? 'h-[54px] w-[72px] bg-black/10'
            : 'h-[54px] w-[72px] bg-transparent'
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
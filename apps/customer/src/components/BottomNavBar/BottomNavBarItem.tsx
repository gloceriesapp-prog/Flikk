import { Platform, Pressable, Text, View } from 'react-native';
import { IconlyHome, IconlyStore, type IconlyIconProps } from '../icons/iconly';
import { NavBuyAgainIcon } from '../icons/NavBuyAgainIcon';
import { NavCategoryIcon } from '../icons/NavCategoryIcon';
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
  'order-again': NavBuyAgainIcon,
  categories: NavCategoryIcon,
  store: IconlyStore,
};

// Every glyph is drawn in a 24-unit box but fills a different share of it
// (Home reaches ~21.5 units, Categories ~20.5, Store ~19.8, Buy again ~19.5),
// so the same size would look uneven. Each is scaled so the visible drawing
// comes out the same, about 17 pt across.
const ICON_SIZE: Record<string, number> = { home: 19, categories: 20, store: 20.7, 'order-again': 21 };

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
        <Icon size={ICON_SIZE[tab.id] ?? 20} color={isActive ? '#101C10' : '#101C1099'} active={isActive} />

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
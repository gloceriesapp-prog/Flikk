import { Pressable, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import type { NavTab } from './data';

interface Props {
  tab: NavTab;
  isActive: boolean;
  onPress: () => void;
}

export function BottomNavBarItem({ tab, isActive, onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="items-center px-0">
      <View
        className={`items-center justify-center gap-1 rounded-full ${isActive
            ? 'h-[54px] w-[72px] bg-black/10'
            : 'h-[54px] w-[72px] bg-transparent'
          }`}
      >
        <AppIcon
          icon={tab.icon}
          size={20}
          color={isActive ? '#101C10' : '#101C1099'}
        />

        <Text
          className={`text-[11px] ${isActive ? 'font-bold text-ink' : 'text-ink/60'
            }`}
        >
          {tab.label}
        </Text>
      </View>
    </Pressable>
  );
}
// Not a real text input — tapping it navigates to the dedicated Search
// screen (screens/search/SearchScreen.tsx), which owns the actual typing.
// A persistent border keeps the white surface visible over the scrolling blur.
// Only the product hint rolls; the word Search remains fixed.

import { Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { RotatingSearchHint } from './RotatingSearchHint';

interface Props {
  onPress: () => void;
}

export function HomeSearchBar({ onPress }: Props) {
  return (
    <View className="mt-1.5 w-full">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Search products"
        className="
          h-[52px] w-full
          flex-row items-center
          rounded-[17px]
          border-[0.7px] border-[#B9C3CC]
          bg-white
          px-4
          active:opacity-80
        "
      >
        <View className="pr-2">
          <AppIcon
            icon={Search01Icon}
            size={18}
            color={colors.ink}
          />
        </View>

        <View className="flex-1">
          <RotatingSearchHint />
        </View>
      </Pressable>
    </View>
  );
}
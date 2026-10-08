// Not a real text input — tapping it navigates to the dedicated Search
// screen (screens/search/SearchScreen.tsx), which owns the actual typing.
// A persistent border keeps the white surface visible over the scrolling blur.
// Only the product hint rolls; the word Search remains fixed.

import { Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { useCopy } from '../../../api/appConfig';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { RotatingSearchHint } from './RotatingSearchHint';

interface Props {
  onPress: () => void;
}

export function HomeSearchBar({ onPress }: Props) {
  // Admin App content: home.search.placeholder replaces the rolling hints.
  const placeholder = useCopy('home.search.placeholder');
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
          {placeholder ? (
            <Text numberOfLines={1} className="text-base font-medium text-ink/55">{placeholder}</Text>
          ) : <RotatingSearchHint />}
        </View>
      </Pressable>
    </View>
  );
}
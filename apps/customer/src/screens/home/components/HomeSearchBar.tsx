// Not a real text input — tapping it navigates to the dedicated Search
// screen (screens/search/SearchScreen.tsx), which owns the actual typing.
// This bar just looks like an input and shows the rolling search-term hint
// (RotatingSearchHint — same rotating-text mechanism kept, only the outer
// shell changed). One pill now, not a search box plus a separate icon box:
// magnifying glass + hint on the left, a filter icon on the right, matching
// the reference exactly. Truck/mic shortcuts dropped — TrackOrder is still
// reachable from Purchase's LiveOrderCard, this bar just no longer
// duplicates that shortcut.

import { PreferenceVerticalIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { RotatingSearchHint } from './RotatingSearchHint';

interface Props {
  onPress: () => void;
}

export function HomeSearchBar({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} className="mt-4 h-[52px] flex-row items-center rounded-full bg-gray-100 px-4">
      <View className="pr-2">
        <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
      </View>
      <View className="flex-1">
        <RotatingSearchHint />
      </View>

      <View className="h-5 w-px bg-gray-300" />

      <Pressable hitSlop={8} className="pl-3">
        <AppIcon icon={PreferenceVerticalIcon} size={19} color={colors.ink} strokeWidth={1.8} />
      </Pressable>
    </Pressable>
  );
}

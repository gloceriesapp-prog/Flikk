// Not a real text input — tapping it navigates to the dedicated Search
// screen (screens/search/SearchScreen.tsx), which owns the actual typing.
// This bar just looks like an input and shows the rolling search-term hint.
//
// Trailing "notes" (order list) and "heart" (wishlist) icons are stubs for
// screens that don't exist yet, kept visible so the layout matches the
// reference without implying functionality that isn't there.

import { HeartIcon, Note01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';
import { RotatingSearchHint } from './RotatingSearchHint';

interface Props {
  onPress: () => void;
}

export function HomeSearchBar({ onPress }: Props) {
  return (
    <View className="mt-4 flex-row items-center gap-2.5">
      <Pressable
        onPress={onPress}
        className="h-[52px] flex-1 flex-row items-center rounded-full bg-white px-4 border border-gray-100"
      >
        <View className="pr-2">
          <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
        </View>
        <View className="flex-1">
          <RotatingSearchHint />
        </View>
      </Pressable>

      <View className="h-[52px] flex-row items-center gap-3 rounded-full bg-white px-4 shadow-sm shadow-black/5">
        <Pressable hitSlop={8}>
          <AppIcon icon={Note01Icon} size={18} color={colors.ink} />
        </Pressable>
        <View className="h-5 w-px bg-slate-200" />
        <Pressable hitSlop={8}>
          <AppIcon icon={HeartIcon} size={18} color={colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

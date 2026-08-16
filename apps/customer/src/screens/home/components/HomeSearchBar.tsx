// Search entry point for the future catalog browse (PRD C4/C5, not built yet)
// — trailing "notes" (order list) and "heart" (wishlist) icons are stubs for
// screens that don't exist yet, kept visible so the layout matches the
// reference without implying functionality that isn't there.

import { HeartIcon, Note01Icon, Search01Icon } from '@hugeicons/core-free-icons';
import { Pressable, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function HomeSearchBar({ value, onChangeText, placeholder = 'Search for groceries, medicines...' }: Props) {
  return (
    <View className="mt-4 flex-row items-center gap-2.5">
      <View className="h-[52px] flex-1 flex-row items-center rounded-full bg-white px-4 border border-gray-100">
        <View className="pr-2">
          <AppIcon icon={Search01Icon} size={18} color={colors.ink} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA5A3"
          textAlignVertical="center"
          className="h-full flex-1 py-0 text-base leading-tight text-ink"
        />
      </View>

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

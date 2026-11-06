// Real, typeable search input — the Home search bar (HomeSearchBar.tsx) is
// just a button that opens this screen; actual typing only happens here.
// No voice search: expo-speech-recognition isn't linked in the native builds.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Pressable, TextInput, View } from 'react-native';
import { AppIcon } from '../../../components/AppIcon';
import { colors } from '../../../theme/tokens';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onBack: () => void;
}

export function SearchHeader({ value, onChangeText, onBack }: Props) {
  return (
    <View className="flex-row items-center gap-2 border-b border-mist pb-3 pl-3 pr-5 pt-safe">
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoFocus
        placeholder="Search groceries & essentials"
        placeholderTextColor="#9AA5A3"
        multiline={false}
        numberOfLines={1}
        returnKeyType="search"
        className="flex-1 py-2 text-[16px] text-ink"
      />
    </View>
  );
}

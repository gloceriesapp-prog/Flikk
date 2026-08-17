// Real, typeable search input — the Home search bar (HomeSearchBar.tsx) is
// just a button that opens this screen; actual typing only happens here.

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
    <View className="flex-row items-center gap-3 border-b border-mist px-5 pb-3 pt-safe">
      <Pressable onPress={onBack} hitSlop={12} className="h-11 w-11 items-center justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoFocus
        placeholder="Search in Groceries & Essentials"
        placeholderTextColor="#9AA5A3"
        className="flex-1 py-2 text-lg text-ink"
      />
    </View>
  );
}

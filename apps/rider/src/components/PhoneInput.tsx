// India-only phone entry for v1 (single launch zone, CLAUDE.md's own
// scope discipline). +91 prefix is fixed, not editable. Same shape as
// apps/customer/apps/partner's own PhoneInput.tsx.

import { Text, TextInput, View } from 'react-native';

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
}

export function PhoneInput({ value, onChangeText, autoFocus, editable = true }: Props) {
  return (
    <View className="h-[52px] flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
      <Text className="pr-3 text-base font-medium text-ink">🇮🇳 +91</Text>
      <View className="mr-3 h-6 w-px bg-gray-200" />
      <TextInput
        editable={editable}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, 10))}
        placeholder="Enter mobile number"
        placeholderTextColor="#9AA5A3"
        keyboardType="number-pad"
        maxLength={10}
        autoFocus={autoFocus}
        textAlignVertical="center"
        className="h-full flex-1 py-0 text-base font-medium leading-tight text-ink"
      />
    </View>
  );
}

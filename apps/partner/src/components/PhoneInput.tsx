// India-only phone entry for v1 (single launch zone, per
// specs/00-foundation/out-of-scope.md — no multi-country support implied
// or needed). +91 prefix is fixed, not editable. Copied from
// apps/customer/src/components/PhoneInput.tsx — same shape, this app's own
// border/radius tokens.

import { Text, TextInput, View } from 'react-native';

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
}

export function PhoneInput({ value, onChangeText, autoFocus }: Props) {
  return (
    <View className="h-[52px] flex-row items-center rounded-2xl border border-gray-200 bg-white px-4">
      <Text className="pr-3 text-base font-medium text-ink">🇮🇳 +91</Text>
      <View className="mr-3 h-6 w-px bg-gray-200" />
      <TextInput
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, 10))}
        placeholder="Enter mobile number"
        placeholderTextColor="#9AA5A3"
        keyboardType="number-pad"
        maxLength={10}
        autoFocus={autoFocus}
        textAlignVertical="center"
        // TextInput carries platform-default vertical padding (worse on
        // Android) that the parent's items-center alone doesn't cancel —
        // zero it out and let the row height + textAlignVertical do the
        // centering instead.
        className="h-full flex-1 py-0 text-base font-medium leading-tight text-ink"
      />
    </View>
  );
}

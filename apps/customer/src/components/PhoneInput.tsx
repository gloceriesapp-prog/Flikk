// India-only phone entry for v1 (single launch zone, per specs/00-foundation/out-of-scope.md
// — no multi-country support implied or needed). +91 prefix is fixed, not editable
// (the chevron is decorative, matching the reference's own dropdown affordance,
// not a real country picker).
//
// Underline style now — no box, no border outline, no notch label. Just a
// single row: country code · vertical divider · "Enter phone number" field,
// with one horizontal rule under the whole row that goes black on focus (gray
// at rest). No green anywhere, per an explicit ask to drop the lime accent.
// Only consumer is LoginScreen.tsx.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
}

export function PhoneInput({ value, onChangeText, autoFocus }: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View
      className="mt-2.5 flex-row items-center border-b pb-3"
      style={{ borderColor: isFocused ? colors.ink : '#D1D5DB' }}
    >
      <Text className="pr-3 text-base font-medium text-ink">🇮🇳 +91</Text>
      <View className="mr-3 h-6 w-px bg-slate-200" />
      <TextInput
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, 10))}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Enter phone number"
        placeholderTextColor="#9AA5A3"
        keyboardType="number-pad"
        maxLength={10}
        autoFocus={autoFocus}
        // Zero the platform-default vertical padding so the text sits on the
        // same baseline as the country code; the row's items-center handles
        // vertical alignment.
        className="flex-1 py-0 text-base leading-tight text-ink"
      />
    </View>
  );
}

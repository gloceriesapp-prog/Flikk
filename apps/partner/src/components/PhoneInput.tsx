// India-only phone entry (single launch zone, CLAUDE.md) — +91 prefix
// fixed, not editable (the chevron is decorative, not a real country
// picker). Same notched-outline shape as apps/customer's own PhoneInput.tsx
// — per an explicit ask to match the login flow's UI exactly across both
// apps, not just keep a similar-but-drifted copy.
//
// Notched-outline label — "Your Phone Number" sits ON the top border, not
// floating separately above the box. Border is thin, gray at rest, black
// once focused (isFocused state below).
//
// rounded-[13px], not a `rounded-button` theme key — customer's own
// tailwind.config.js defines that as a borderRadius extension partner's
// config doesn't have; the literal value matches exactly without adding a
// new theme key for one component.

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { colors } from '../theme/tokens';

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
}

export function PhoneInput({ value, onChangeText, autoFocus, editable = true }: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="relative mt-2.5">
      <View
        className="h-[52px] flex-row items-center rounded-[13px] border px-4"
        style={{ borderColor: isFocused ? colors.ink : '#D1D5DB' }}
      >
        <Text className="pr-1.5 text-base font-medium text-ink">🇮🇳 +91</Text>
        <View className="mx-3 h-6 w-px bg-slate-200" />
        <TextInput
          editable={editable}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, 10))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="We'll send an OTP to verify"
          placeholderTextColor="#9AA5A3"
          keyboardType="number-pad"
          maxLength={10}
          autoFocus={autoFocus}
          textAlignVertical="center"
          className="h-full flex-1 py-0 text-base leading-tight text-ink"
        />
      </View>

      <View style={{ position: 'absolute', top: -10, left: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: `${colors.ink}80` }}>Your Phone Number</Text>
      </View>
    </View>
  );
}

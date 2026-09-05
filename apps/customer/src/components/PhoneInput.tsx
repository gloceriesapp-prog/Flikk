// India-only phone entry for v1 (single launch zone, per specs/00-foundation/out-of-scope.md
// — no multi-country support implied or needed). +91 prefix is fixed, not editable
// (the chevron is decorative, matching the reference's own dropdown affordance,
// not a real country picker).
//
// Notched-outline label — "Enter Phone Number" sits ON the top border, not
// floating separately above the box. Border is thin (1px, was 1.5px) and
// gray at rest, black once focused (isFocused state below) — no green
// anywhere on this component anymore, per an explicit ask to drop the
// lime accent here.
//
// Placeholder text is its own line now, not a repeat of the notch label —
// "We'll send an OTP to verify" tells a first-time user *why* the number's
// needed and that nothing else happens with it (no spam call, no account
// created yet), which is the actual trust question a phone-number field
// raises. Only consumer is LoginScreen.tsx, so this doesn't touch any
// other screen.

import { useState } from 'react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Text, TextInput, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { colors } from '../theme/tokens';

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
}

export function PhoneInput({ value, onChangeText, autoFocus }: Props) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="relative mt-2.5">
      <View
        className="h-[52px] flex-row items-center rounded-button border px-4"
        style={{ borderColor: isFocused ? colors.ink : '#D1D5DB' }}
      >
        <Text className="pr-1.5 text-base font-medium text-ink">🇮🇳 +91</Text>
        <View className="mx-3 h-6 w-px bg-slate-200" />
        <TextInput
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
          // TextInput carries platform-default vertical padding (worse on Android)
          // that the parent's items-center alone doesn't cancel — zero it out and
          // let the row height + textAlignVertical do the centering instead.
          className="h-full flex-1 py-0 text-base leading-tight text-ink9741"
        />
      </View>

      {/* Notch — absolutely positioned over the box's own top border,
          white background clipping the border line behind the text so it
          reads as a break in the outline, not a label floating above it. */}
      <View className="absolute -top-2.5 left-3 bg-white px-1">
        <Text className="text-xs font-medium text-ink/50">Your Phone Number</Text>
      </View>
    </View>
  );
}

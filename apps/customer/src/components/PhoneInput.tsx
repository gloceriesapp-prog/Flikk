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
          className="h-full flex-1 py-0 text-base leading-tight text-ink"
        />
      </View>

      {/* Notch — absolutely positioned over the box's own top border,
          white background clipping the border line behind the text so it
          reads as a break in the outline, not a label floating above it.
          Plain inline style, not className — this Text was silently
          rendering truncated to "Your Phone" (no ellipsis, no wrap, the
          word "Number" just never painted) even with a verified-clean
          source string and a verified-correct served bundle, on a
          completely fresh install with no possible stale cache. That
          combination points at a NativeWind class-compilation quirk
          specific to this Text/View pair, not a real content bug —
          switching to inline style removes NativeWind from the render
          path for this label entirely. */}
      <View style={{ position: 'absolute', top: -10, left: 12, backgroundColor: '#FFFFFF', paddingHorizontal: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '500', color: `${colors.ink}80` }}>Your Phone Number</Text>
      </View>
    </View>
  );
}

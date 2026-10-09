// Renders N visual boxes but is driven by a single hidden TextInput — the
// reliable cross-platform pattern for OTP entry (avoids per-box focus/paste
// bugs that come from managing N separate TextInputs).

import { useRef } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

const OTP_LENGTH = 6;

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
}

export function OtpBoxInput({ value, onChangeText, autoFocus, editable = true }: Props) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(OTP_LENGTH, ' ').split('');

  return (
    // justify-between used to stretch 6 boxes across the full row width on wider
    // screens — fixed gap + centered instead, tighter and consistent regardless
    // of device width.
    <Pressable disabled={!editable} onPress={() => inputRef.current?.focus()} className="flex-row justify-center gap-2.5">
      {digits.map((digit, i) => (
        <View
          key={i}
          className={`h-14 w-12 items-center justify-center rounded-button border bg-white ${
            i === value.length ? 'border-ink' : 'border-slate-200'
          }`}
        >
          <Text className="text-xl font-semibold text-ink">{digit.trim()}</Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
        editable={editable}
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        accessibilityLabel="6-digit verification code"
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        className="absolute h-full w-full opacity-0"
      />
    </Pressable>
  );
}

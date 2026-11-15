// Renders N visual boxes but is driven by a single hidden TextInput — the
// reliable cross-platform pattern for OTP entry (paste, SMS autofill and
// backspace all work on one native input). Plain StyleSheet, not NativeWind
// classes: the hidden input must always cover the boxes and the boxes must
// never take the touch, or the keyboard never opens. Same as apps/partner's
// own OtpBoxInput.tsx.

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme/tokens';

const OTP_LENGTH = 6;

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
}

export function OtpBoxInput({ value, onChangeText, autoFocus }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} accessible={false} style={styles.container}>
      <View style={styles.boxes} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <View
            key={index}
            style={[
              styles.box,
              { borderColor: focused && index === Math.min(value.length, OTP_LENGTH - 1) ? colors.ink : '#E5E7EB' },
            ]}
          >
            <Text style={styles.digit}>{value[index] ?? ''}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        accessibilityLabel="Six-digit verification code"
        accessibilityHint="Enter the code sent to your phone number"
        caretHidden
        style={styles.nativeInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', width: '100%' },
  boxes: { flexDirection: 'row', gap: 10 },
  box: { flex: 1, minWidth: 0, height: 56, borderWidth: 1.5, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  digit: { fontSize: 20, fontWeight: '600', color: colors.ink },
  nativeInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, color: 'transparent', backgroundColor: 'transparent' },
});

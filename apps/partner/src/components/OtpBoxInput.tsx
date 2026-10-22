import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AEONIK } from '../theme/fonts';

const OTP_LENGTH = 6;

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
  invalid?: boolean;
}

// One native input supports paste/autofill/backspace; six boxes show its value.
export function OtpBoxInput({ value, onChangeText, autoFocus, editable = true, invalid = false }: Props) {
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
              { borderColor: invalid ? '#C82A36' : focused && index === Math.min(value.length, OTP_LENGTH - 1) ? '#2457F5' : '#E5E7EB' },
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
        editable={editable}
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        accessibilityLabel="Six-digit verification code"
        accessibilityHint="Enter the code sent to your phone number"
        caretHidden
        contextMenuHidden={false}
        style={styles.nativeInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', width: '100%' },
  boxes: { flexDirection: 'row', gap: 10 },
  box: { flex: 1, minWidth: 0, height: 54, borderWidth: 1.5, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  digit: { fontFamily: AEONIK.semiBold, fontSize: 23, lineHeight: 30, color: '#2D3547' },
  nativeInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, color: 'transparent', backgroundColor: 'transparent' },
});

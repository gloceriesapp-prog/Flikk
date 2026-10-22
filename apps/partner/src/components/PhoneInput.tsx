import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AEONIK } from '../theme/fonts';

interface Props {
  value: string;
  onChangeText: (digits: string) => void;
  autoFocus?: boolean;
}

// India is the fixed launch country; tapping the prefix focuses phone entry.
export function PhoneInput({ value, onChangeText, autoFocus }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label} nativeID="partner-phone-label">Phone Number</Text>
      <View style={[styles.row, { borderBottomColor: isFocused ? '#2457F5' : '#CBD5E1' }]}>
        <Pressable
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="button"
          accessibilityLabel="India, fixed country code plus 91. Enter phone number"
          hitSlop={6}
          style={styles.prefix}
        >
          <Text style={styles.flag} accessible={false}>🇮🇳</Text>
          <Text style={styles.countryCode}>+91</Text>
        </Pressable>
        <View style={styles.divider} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, 10))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel="Phone number"
          accessibilityLabelledBy="partner-phone-label"
          keyboardType="number-pad"
          textContentType="telephoneNumber"
          autoComplete="tel-national"
          autoCorrect={false}
          maxLength={10}
          autoFocus={autoFocus}
          textAlignVertical="center"
          selectionColor="#2457F5"
          underlineColorAndroid="transparent"
          style={styles.input}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { width: '100%', paddingHorizontal: 0, paddingTop: 8, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  label: { fontFamily: AEONIK.medium, fontSize: 12, lineHeight: 16, color: '#7B8493' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 35, paddingBottom: 3, borderBottomWidth: 1.5 },
  prefix: { flexDirection: 'row', gap: 7, minHeight: 32, justifyContent: 'center', alignItems: 'center', paddingRight: 10 },
  flag: { fontSize: 15, lineHeight: 22 },
  countryCode: { fontFamily: AEONIK.semiBold, fontSize: 14, lineHeight: 22, color: '#202124' },
  divider: { width: 1, height: 16, backgroundColor: '#AAB5C5', marginRight: 10 },
  input: { flex: 1, minWidth: 0, height: 32, paddingHorizontal: 0, paddingVertical: 0, fontFamily: AEONIK.medium, fontSize: 14, color: '#202124' },
});

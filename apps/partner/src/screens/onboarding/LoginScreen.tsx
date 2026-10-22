import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { PhoneInput } from '../../components/PhoneInput';
import { AEONIK } from '../../theme/fonts';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canContinue = phone.length === 10 && !loading;

  async function handleContinue() {
    if (!canContinue) return;
    setError(null);
    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      const { devMode } = await requestOtp(fullPhone);
      navigation.navigate('OtpVerification', { phone: fullPhone, devMode });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      key={width}
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: Math.max(24, insets.bottom),
          paddingLeft: Math.max(20, insets.left),
          paddingRight: Math.max(20, insets.right),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.content}>
          <View style={styles.brand} accessible accessibilityLabel="Gloceries Store Partner">
            <Text style={styles.wordmark} maxFontSizeMultiplier={1.3}>gloceries</Text>
            <Text style={styles.brandSubtitle}>STORE{'\n'}PARTNER</Text>
          </View>

          <Text style={styles.instructions}>
            Enter your mobile number to sign in.
            {'\n'}We’ll send you a verification code.
          </Text>

          <PhoneInput
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              if (error) setError(null);
            }}
          />
          {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}

          <Pressable
            onPress={handleContinue}
            disabled={!canContinue}
            accessibilityRole="button"
            accessibilityLabel="Send OTP"
            accessibilityState={{ disabled: !canContinue, busy: loading }}
            style={[styles.button, { backgroundColor: canContinue || loading ? '#2457F5' : '#93B8F5' }]}
          >
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonLabel}>Send OTP</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center' },
  brand: { alignItems: 'center' },
  wordmark: { fontFamily: AEONIK.black, fontWeight: '900', fontSize: 44, lineHeight: 54, letterSpacing: -1.8, color: '#080808' },
  brandSubtitle: { marginTop: 2, fontFamily: AEONIK.bold, fontSize: 13, lineHeight: 18, letterSpacing: 3.5, textAlign: 'center', color: '#111111' },
  instructions: { marginTop: 28, marginBottom: 22, fontFamily: AEONIK.medium, fontSize: 16, lineHeight: 22, textAlign: 'center', color: '#454D60' },
  error: { marginTop: 12, fontFamily: AEONIK.medium, fontSize: 13, lineHeight: 19, color: '#C82A36' },
  button: { marginTop: 28, minHeight: 52, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontFamily: AEONIK.semiBold, fontSize: 18, lineHeight: 26, color: '#FFFFFF' },
});

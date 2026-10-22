import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
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
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '../../components/AppIcon';
import { requestOtp, verifyOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { OtpBoxInput } from '../../components/OtpBoxInput';
import { useAuthStore } from '../../store/useAuthStore';
import { AEONIK } from '../../theme/fonts';
import { roleMismatchMessage } from '../../utils/roleGuard';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;
const RESEND_COOLDOWN_MS = 30_000;

export function OtpVerificationScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(() => Date.now() + RESEND_COOLDOWN_MS);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const requestInFlight = useRef(false);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 1000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') update(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [resendAt]);

  const handleVerify = useCallback(async () => {
    if (code.length !== 6 || requestInFlight.current) return;
    requestInFlight.current = true;
    setError(null);
    setLoading(true);
    try {
      const { access_token, refresh_token, is_approved, has_store, application_submitted, role } = await verifyOtp(phone, code);
      const mismatch = roleMismatchMessage(role);
      if (mismatch) {
        setError(mismatch);
        setCode('');
        return;
      }
      // RootNavigator chooses the appropriate signed-in/store setup screen.
      await setSession(access_token, refresh_token, is_approved, has_store, application_submitted);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify the code. Please try again.');
      if (err instanceof ApiError && err.code === 'OTP_INVALID') setCode('');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }, [code, phone, setSession]);

  async function handleResend() {
    if (Date.now() < resendAt || requestInFlight.current) return;
    requestInFlight.current = true;
    setResending(true);
    setError(null);
    try {
      await requestOtp(phone);
      setCode('');
      setResendAt(Date.now() + RESEND_COOLDOWN_MS);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend code. Please try again.');
    } finally {
      requestInFlight.current = false;
      setResending(false);
    }
  }

  const resendDisabled = secondsLeft > 0 || loading || resending;
  const displayPhone = phone.startsWith('+91') ? `+91-${phone.slice(3)}` : phone;

  return (
    <KeyboardAvoidingView key={width} style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(24, insets.bottom),
          paddingLeft: Math.max(20, insets.left),
          paddingRight: Math.max(20, insets.right),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to phone number" onPress={() => navigation.goBack()} hitSlop={8} style={styles.back}>
              <AppIcon icon={ArrowLeft02Icon} size={24} color="#202124" />
            </Pressable>
            <Text style={styles.title} accessibilityRole="header">Verify details</Text>
          </View>

          <View style={styles.details}>
            <Text style={styles.description}>We have sent an OTP to</Text>
            <Text style={styles.phone}>{displayPhone}</Text>
          </View>

          <View style={styles.code}>
            <OtpBoxInput value={code} onChangeText={(digits) => { setCode(digits); if (error) setError(null); }} autoFocus editable={!loading && !resending} invalid={Boolean(error)} />
            {error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
          </View>

          <View style={styles.footer}>
            <Text style={styles.timer} accessibilityLabel={`Resend available in ${secondsLeft} seconds`}>
              00:{String(secondsLeft).padStart(2, '0')}
            </Text>
            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn’t receive the code?</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Resend OTP" accessibilityState={{ disabled: resendDisabled, busy: resending }} disabled={resendDisabled} onPress={handleResend} style={styles.resendButton}>
                <Text style={[styles.resendText, { color: resendDisabled ? '#AAB0BE' : '#2457F5' }]}>{resending ? 'Sending…' : 'Resend now'}</Text>
              </Pressable>
            </View>
            {(code.length === 6 || loading) && (
              <Pressable accessibilityRole="button" accessibilityLabel="Verify OTP" accessibilityState={{ disabled: loading || resending, busy: loading }} disabled={loading || resending} onPress={handleVerify} style={styles.verifyButton}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.verifyText}>Verify OTP</Text>}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, minHeight: 410, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  back: { position: 'absolute', left: -8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { marginHorizontal: 44, fontFamily: AEONIK.semiBold, fontSize: 20, lineHeight: 28, textAlign: 'center', color: '#2D3547' },
  details: { marginTop: 44, alignItems: 'center' },
  description: { fontFamily: AEONIK.medium, fontSize: 17, lineHeight: 24, color: '#454D60', textAlign: 'center' },
  phone: { fontFamily: AEONIK.bold, fontSize: 18, lineHeight: 25, color: '#2D3547', textAlign: 'center' },
  code: { marginTop: 64 },
  error: { marginTop: 14, fontFamily: AEONIK.medium, fontSize: 13, lineHeight: 19, textAlign: 'center', color: '#C82A36' },
  footer: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 40 },
  timer: { fontFamily: AEONIK.semiBold, fontSize: 21, lineHeight: 29, color: '#202124', textAlign: 'center', fontVariant: ['tabular-nums'] },
  resendRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', columnGap: 5 },
  resendPrompt: { fontFamily: AEONIK.medium, fontSize: 15, lineHeight: 22, color: '#454D60' },
  resendButton: { minHeight: 44, justifyContent: 'center' },
  resendText: { fontFamily: AEONIK.semiBold, fontSize: 15, lineHeight: 22 },
  verifyButton: { marginTop: 16, minHeight: 52, paddingVertical: 13, paddingHorizontal: 20, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2457F5' },
  verifyText: { fontFamily: AEONIK.semiBold, fontSize: 18, lineHeight: 26, color: '#FFFFFF' },
});

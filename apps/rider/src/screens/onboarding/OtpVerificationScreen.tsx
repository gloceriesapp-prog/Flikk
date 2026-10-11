// Real OTP verification against Supabase phone auth (backend's POST
// /auth/otp/verify) — see api/auth.ts's own note on the one real gap this
// doesn't solve (no self-serve "become a rider" flow yet).

import { useEffect, useState } from 'react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Alert, Pressable, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { OtpBoxInput } from '../../components/OtpBoxInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { requestOtp, verifyOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { roleMismatchMessage } from '../../utils/roleGuard';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const RESEND_COOLDOWN_S = 30;

// Backend throttles OTP sends (authBudget.ts: 429 AUTH_RATE_LIMITED). The
// shared ApiError only carries status + message, not the Retry-After header,
// so parse an explicit "N seconds" from the message if present, else fall
// back to a minute (the backend's own "wait a minute" wording).
function cooldownSeconds(message: string): number {
  const m = message.match(/(\d+)\s*second/i);
  return m ? Number(m[1]) : 60;
}

export function OtpVerificationScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // Starts > 0 on mount — the code was already sent from LoginScreen, so the
  // rider waits out one cooldown before the first resend is offered.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [sent, setSent] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleVerify() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await verifyOtp(phone, code);
      // One phone number, one role — checked BEFORE setSession ever
      // persists anything, so an already-approved Partner account never
      // gets a half-working session on this app (utils/roleGuard.ts's own
      // note). 'customer' still passes through here — AccountStatusScreen
      // is what tells that case apart from an actual approved rider.
      const mismatch = roleMismatchMessage(result.role);
      if (mismatch) {
        Alert.alert('Could not sign in', mismatch);
        return;
      }
      await setSession(result.accessToken, result.refreshToken, result.phone);
      // No further navigation needed — RootNavigator swaps to AppNavigator
      // the instant useAuthStore.accessToken becomes non-null.
    } catch (err) {
      setCode('');
      Alert.alert('Could not verify code', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resending || cooldown > 0) return;
    setResending(true);
    try {
      await requestOtp(phone);
      setCode('');
      setSent(true);
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      // Respect the backend's own throttle window instead of letting the
      // rider keep hammering resend into more 429s.
      if (err instanceof ApiError && err.status === 429) {
        setSent(false);
        setCooldown(cooldownSeconds(err.message));
      } else {
        Alert.alert('Could not resend code', err instanceof Error ? err.message : 'Please try again.');
      }
    } finally {
      setResending(false);
    }
  }

  return (
    <DismissKeyboardView>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <StatusBar style="dark" />
        <View className="flex-1 px-6 pb-safe-offset-6 pt-safe-offset-4">
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={20}
            className="self-start"
          >
            <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
          </Pressable>

          <View className="mt-6 flex-1 gap-8">
            <View className="gap-2">
              <Text className="text-2xl font-semibold text-ink">Enter the code</Text>
              <Text className="text-[15px] font-medium text-ink/55">
                Sent to <Text className="font-semibold text-ink">{phone}</Text> · valid for 10 minutes
              </Text>
            </View>

            <OtpBoxInput value={code} onChangeText={setCode} autoFocus />

            <View className="items-center">
              {cooldown > 0 ? (
                <Text className="text-[15px] font-medium text-ink/45">
                  {sent ? 'Code sent · ' : ''}Resend in {cooldown}s
                </Text>
              ) : (
                <Pressable onPress={handleResend} disabled={resending} hitSlop={12}>
                  <Text className="text-[15px] font-semibold text-[#1447E6]">
                    {resending ? 'Sending…' : 'Resend code'}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <PrimaryButton label="Verify code" onPress={handleVerify} loading={loading} disabled={code.length !== 6} tone="blue" />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}
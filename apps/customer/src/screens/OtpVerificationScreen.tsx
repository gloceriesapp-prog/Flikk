// Verifies the code sent by LoginScreen, then persists the session and hands
// off to the app shell. See specs/00-foundation/auth-and-roles.md for the flow.
//
// No hero image anymore — the top header bg was removed per an explicit ask;
// the "Verify your number" title + OTP boxes now sit at the top of the screen
// directly. Back button is a plain top-left circle (no longer floating over a
// photo). The whole hero + keyboard-shrink animation setup Login shares was
// dropped here since there's no hero left to shrink. Same no-green rule
// (OtpBoxInput.tsx's active box border is black, not lime).

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp, verifyOtp } from '../api/auth';
import { ApiError } from '../api/client';
import { AppIcon } from '../components/AppIcon';
import { OtpBoxInput } from '../components/OtpBoxInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/tokens';
import { roleMismatchMessage } from '../utils/roleGuard';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpVerificationScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const setSession = useAuthStore((s) => s.setSession);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = useCallback(
    async (otp: string) => {
      setError(null);
      setLoading(true);
      try {
        const { access_token, refresh_token, role } = await verifyOtp(phone, otp);
        // One phone number, one role — checked BEFORE setSession ever
        // persists anything, so a mismatched account (already an approved
        // Partner/Rider elsewhere) never gets into a half-working logged-in
        // state on this app (utils/roleGuard.ts's own note).
        const mismatch = roleMismatchMessage(role);
        if (mismatch) {
          setError(mismatch);
          setCode('');
          return;
        }
        await setSession(access_token, refresh_token);
        // RootNavigator swaps to the app shell automatically once accessToken is set
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
        setCode('');
      } finally {
        setLoading(false);
      }
    },
    [phone, setSession],
  );

  // auto-submit once all 6 digits are entered — one less tap for the user.
  // Triggered from the input's own change handler, not an effect watching
  // `code`, so this isn't a setState-in-effect cascade.
  function handleCodeChange(digits: string) {
    setCode(digits);
    if (digits.length === 6) handleVerify(digits);
  }

  async function handleResend() {
    if (secondsLeft > 0) return;
    setError(null);
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    try {
      await requestOtp(phone);
    } catch {
      setError('Could not resend code. Please try again.');
    }
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 gap-5 px-6 pb-safe-offset-6 pt-safe-offset-4">
          {/* Back — plain top-left circle now (no hero photo to float over). */}
          <Pressable accessibilityRole="button" accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            hitSlop={12}
            className="h-11 w-11 items-center justify-center rounded-full bg-gray-100"
          >
            <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
          </Pressable>

          <View className="gap-1.5">
            <Text className="text-2xl font-semibold leading-8 text-ink">Verify your number.</Text>
            <Text className="text-sm text-ink/55">
              Code sent to <Text className="font-semibold text-ink">{phone}</Text>
            </Text>
          </View>

          <OtpBoxInput value={code} onChangeText={handleCodeChange} autoFocus />
          {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}

          <Pressable onPress={handleResend} disabled={secondsLeft > 0}>
            <Text className="text-center text-[13px] text-ink/55">
              {secondsLeft > 0
                ? `Didn't receive the code? Retry in 00:${String(secondsLeft).padStart(2, '0')}`
                : "Didn't receive the code? Resend"}
            </Text>
          </Pressable>

          {/* Always visible now, not just once loading — this used to be
              auto-submit-only (fires the instant the 6th digit is typed),
              which is fine for anyone who fills all 6 boxes, but left no
              visible next step for someone who pastes a code, or just
              expects a button to press like every other form. Disabled
              until 6 digits are in; pressing it while auto-submit has
              already fired is harmless (handleVerify's own setLoading
              guards against a second request). */}
          <PrimaryButton
            label={loading ? 'Verifying…' : 'Continue'}
            onPress={() => handleVerify(code)}
            disabled={code.length !== 6 || loading}
            loading={loading}
            variant="blue"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

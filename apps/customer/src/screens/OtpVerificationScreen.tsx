// Verifies the code sent by LoginScreen, then persists the session and hands
// off to the app shell. See specs/00-foundation/auth-and-roles.md for the flow.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp, verifyOtp } from '../api/auth';
import { ApiError } from '../api/client';
import { AppIcon } from '../components/AppIcon';
import { OtpBoxInput } from '../components/OtpBoxInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/tokens';
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
        const { access_token, refresh_token } = await verifyOtp(phone, otp);
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
    <View className="flex-1 bg-white px-6 pb-safe pt-safe">
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 justify-center">
        <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
      </Pressable>

      <View className="mt-4 gap-5">
        <Text className="text-[22px] font-extrabold text-ink">OTP Verification</Text>
        <Text className="text-sm text-ink/75">
          We have sent a verification code to{' '}
          <Text className="font-semibold opacity-100">{phone}</Text>
        </Text>

        <OtpBoxInput value={code} onChangeText={handleCodeChange} autoFocus />
        {error && <Text className="text-[13px] text-danger">{error}</Text>}

        <Pressable onPress={handleResend} disabled={secondsLeft > 0}>
          <Text className="text-center text-[13px] text-ink/65">
            {secondsLeft > 0
              ? `Didn't receive the OTP? Retry in 00:${String(secondsLeft).padStart(2, '0')}`
              : "Didn't receive the OTP? Resend"}
          </Text>
        </Pressable>
      </View>

      {loading && (
        <View className="mt-auto pb-4">
          <PrimaryButton label="Verifying…" onPress={() => {}} loading />
        </View>
      )}
    </View>
  );
}

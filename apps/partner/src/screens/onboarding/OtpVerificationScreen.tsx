// Verifies the code sent by LoginScreen, then persists the session and
// hands off. Doesn't navigate anywhere itself on success — RootNavigator
// swaps away from the auth stack automatically once useAuthStore's
// accessToken/hasStore/isApproved change, same "swaps automatically"
// pattern as apps/customer/src/screens/OtpVerificationScreen.tsx, just
// with three destinations to route between instead of one (Store Setup /
// Waiting for approval / the real app shell — see RootNavigator.tsx).

import { ArrowLeft01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp, verifyOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { DEMO_OTP_CODE } from '../../api/devAuthFallback';
import { AppIcon } from '../../components/AppIcon';
import { OtpBoxInput } from '../../components/OtpBoxInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const RESEND_COOLDOWN_SECONDS = 30;

export function OtpVerificationScreen({ route, navigation }: Props) {
  const { phone, devMode } = route.params;
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
        const { access_token, is_approved, has_store } = await verifyOtp(phone, otp);
        await setSession(access_token, is_approved, has_store);
        // RootNavigator swaps to Store Setup / Waiting / the app shell
        // automatically once the store updates — see that file's own note.
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
        setCode('');
      } finally {
        setLoading(false);
      }
    },
    [phone, setSession]
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
        <Text className="text-[22px] font-bold text-ink">OTP Verification</Text>
        <Text className="text-sm font-medium text-ink/70">
          We&apos;ve sent a verification code to <Text className="font-semibold text-ink">{phone}</Text>
        </Text>

        <OtpBoxInput value={code} onChangeText={handleCodeChange} autoFocus />
        {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}

        {/* Only shown when requestOtp fell back to the local dev
            stand-in (no backend/SMS provider reachable) — see
            api/devAuthFallback.ts. Disappears the moment a real backend
            answers, since devMode would then be false. */}
        {devMode && (
          <View className="flex-row items-center gap-2 rounded-2xl bg-lime-soft px-4 py-3">
            <AppIcon icon={InformationCircleIcon} size={16} color={colors.limeDeep} />
            <Text className="flex-1 text-xs font-medium text-lime-deep">
              No backend connected — dev mode. Enter <Text className="font-bold">{DEMO_OTP_CODE}</Text> to continue.
            </Text>
          </View>
        )}

        <Pressable onPress={handleResend} disabled={secondsLeft > 0}>
          <Text className="text-center text-[13px] font-medium text-ink/60">
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

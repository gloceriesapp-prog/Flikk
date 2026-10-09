import { AppImage as Image } from '../../components/AppImage';
// Verifies the code sent by LoginScreen, then persists the session and
// hands off. Doesn't navigate anywhere itself on success — RootNavigator
// swaps away from the auth stack automatically once useAuthStore's
// accessToken/hasStore/isApproved change, same "swaps automatically"
// pattern as apps/customer/src/screens/OtpVerificationScreen.tsx, just
// with three destinations to route between instead of one (Store Setup /
// Waiting for approval / the real app shell — see RootNavigator.tsx).
//
// Same fixed (not animated) hero image as LoginScreen.tsx, back button
// floating top-left over it, "Verify your number." headline. The dev-mode
// banner (real functionality, not cosmetic — api/devAuthFallback.ts's own
// local stand-in for "no backend reachable") is kept below the OTP boxes.
//
// 'height' behavior on Android, not undefined — this app has no
// softInputMode override (unlike customer's own 'pan' setup), so Android
// needs a real KeyboardAvoidingView to make room for the keyboard; see
// LoginScreen.tsx's own note on this exact bug (the Continue button
// hiding behind the keyboard).

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp, verifyOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { AppIcon } from '../../components/AppIcon';
import { OtpBoxInput } from '../../components/OtpBoxInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/useAuthStore';
import { colors } from '../../theme/tokens';
import { roleMismatchMessage } from '../../utils/roleGuard';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const RESEND_COOLDOWN_SECONDS = 30;
// Same real hero asset LoginScreen.tsx uses — one consistent image across
// both screens of this flow.
const HERO_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/store-image.jpeg';
const HERO_HEIGHT = 240;

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
        const { access_token, refresh_token, is_approved, has_store, application_submitted, role } = await verifyOtp(phone, otp);
        // One phone number, one role — checked BEFORE setSession ever
        // persists anything, so an already-approved Rider account never
        // gets a half-working session on this app (utils/roleGuard.ts's
        // own note). 'customer' still passes through — that's the real,
        // default state every brand-new applicant is in before they've
        // ever gone through Store Setup.
        const mismatch = roleMismatchMessage(role);
        if (mismatch) {
          setError(mismatch);
          setCode('');
          return;
        }
        await setSession(access_token, refresh_token, is_approved, has_store, application_submitted);
        // RootNavigator swaps to Store Setup / Waiting / the app shell
        // automatically once the store updates — see that file's own note.
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not verify the code. Please try again.');
        // Only a wrong or expired code is cleared; after a sign-in or network
        // failure the same code still works, so keep it for another tap.
        if (err instanceof ApiError && err.code === 'OTP_INVALID') setCode('');
      } finally {
        setLoading(false);
      }
    },
    [phone, setSession]
  );

  // No auto-submit: the code is checked only when Continue is pressed.
  function handleCodeChange(digits: string) {
    setCode(digits);
    if (error) setError(null);
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

      <View style={{ width: '100%', height: HERO_HEIGHT }}>
        <Image source={{ uri: HERO_IMAGE_URI }} style={{ width: '100%', height: HERO_HEIGHT }} resizeMode="cover" />

        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          className="absolute left-5 top-safe-offset-4 h-11 w-11 items-center justify-center rounded-full bg-white"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
        </Pressable>
      </View>

      {/* style, not className — KeyboardAvoidingView isn't NativeWind-patched
          (LoginScreen.tsx's own note); className="flex-1" here was being
          silently dropped, which is why Continue never had real room to
          render at all. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View className="flex-1 gap-5 bg-white px-6 pb-safe pt-7">
          <View className="gap-1.5">
            <Text className="text-2xl font-semibold leading-8 text-ink">Verify your number.</Text>
            <Text className="text-sm text-ink/55">
              Code sent to <Text className="font-semibold text-ink">{phone}</Text> · valid for 10 minutes
            </Text>
          </View>

          <OtpBoxInput value={code} onChangeText={handleCodeChange} autoFocus />
          {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}


          <View className="mt-auto gap-4 pb-6">
            <Pressable onPress={handleResend} disabled={secondsLeft > 0}>
              <Text className="text-center text-[13px] text-ink/55">
                {secondsLeft > 0
                  ? `Didn't receive the code? Retry in 00:${String(secondsLeft).padStart(2, '0')}`
                  : "Didn't receive the code? Resend"}
              </Text>
            </Pressable>

            <PrimaryButton
              label={loading ? 'Verifying…' : 'Continue'}
              onPress={() => { if (!loading) handleVerify(code); }}
              disabled={code.length !== 6 || loading}
              loading={loading}
            />

            <Text className="text-center text-[11px] font-medium text-ink/35">Powered by gloceries.com</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

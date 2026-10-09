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
// floating top-left over it and "Verify your number." headline. Authentication
// always uses the real backend; an offline device never simulates success.
//
// 'height' behavior on Android, not undefined — this app has no
// softInputMode override (unlike customer's own 'pan' setup), so Android
// needs a real KeyboardAvoidingView to make room for the keyboard; see
// LoginScreen.tsx's own note on this exact bug (the Continue button
// hiding behind the keyboard).

import { useCallback, useState } from 'react';
import { useOtpChallenge } from '@gloceries/shared';
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

// Same real hero asset LoginScreen.tsx uses — one consistent image across
// both screens of this flow.
const HERO_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/store-image.jpeg';
const HERO_HEIGHT = 240;

export function OtpVerificationScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const { busy: loading, secondsLeft, canResend, restartCooldown, run } = useOtpChallenge();
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);

  const handleVerify = useCallback(
    async (otp: string) => {
      if (!/^\d{6}$/.test(otp)) return;
      await run(async (isCurrent) => {
        setError(null);
        try {
          const { access_token, refresh_token, is_approved, has_store, application_submitted, role } = await verifyOtp(phone, otp);
          if (!isCurrent()) return;
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
          if (!isCurrent()) return;
          setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
          setCode('');
        }
      });
    },
    [phone, setSession, run]
  );

  // auto-submit once all 6 digits are entered — one less tap for the user.
  function handleCodeChange(digits: string) {
    setCode(digits);
    if (digits.length === 6) handleVerify(digits);
  }

  async function handleResend() {
    if (!canResend()) return;
    await run(async (isCurrent) => {
      setError(null);
      setCode('');
      // Start before sending: an interrupted response may still deliver SMS.
      restartCooldown();
      try {
        await requestOtp(phone);
      } catch (err) {
        if (isCurrent()) setError(err instanceof ApiError ? err.message : 'Could not resend code. Please try again.');
      }
    });
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
              Code sent to <Text className="font-semibold text-ink">{phone}</Text>
            </Text>
          </View>

          <OtpBoxInput value={code} onChangeText={handleCodeChange} editable={!loading} autoFocus />
          {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}

          <View className="mt-auto gap-4 pb-6">
            <Pressable onPress={handleResend} disabled={secondsLeft > 0 || loading}>
              <Text className="text-center text-[13px] text-ink/55">
                {secondsLeft > 0
                  ? `Didn't receive the code? Retry in 00:${String(secondsLeft).padStart(2, '0')}`
                  : "Didn't receive the code? Resend"}
              </Text>
            </Pressable>

            <PrimaryButton
              label={loading ? 'Verifying…' : 'Continue'}
              onPress={() => handleVerify(code)}
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

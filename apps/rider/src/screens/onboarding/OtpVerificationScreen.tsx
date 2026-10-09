// Real OTP verification against Supabase phone auth (backend's POST
// /auth/otp/verify) — see api/auth.ts's own note on the one real gap this
// doesn't solve (no self-serve "become a rider" flow yet).

import { useState } from 'react';
import { useOtpChallenge } from '@gloceries/shared';
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
import { useAuthStore } from '../../store/useAuthStore';
import { roleMismatchMessage } from '../../utils/roleGuard';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

export function OtpVerificationScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const { busy: loading, secondsLeft, canResend, restartCooldown, run } = useOtpChallenge();
  const setSession = useAuthStore((s) => s.setSession);

  async function handleVerify() {
    if (!/^\d{6}$/.test(code)) return;
    await run(async (isCurrent) => {
      try {
        const result = await verifyOtp(phone, code);
        if (!isCurrent()) return;
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
        if (!isCurrent()) return;
        setCode('');
        Alert.alert('Could not verify code', err instanceof Error ? err.message : 'Please try again.');
      }
    });
  }

  async function handleResend() {
    if (!canResend()) return;
    await run(async (isCurrent) => {
      setCode('');
      restartCooldown();
      try {
        await requestOtp(phone);
      } catch (err) {
        if (isCurrent()) Alert.alert('Could not resend code', err instanceof Error ? err.message : 'Please try again.');
      }
    });
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
                Sent to <Text className="font-semibold text-ink">{phone}</Text>
              </Text>
            </View>

            <OtpBoxInput value={code} onChangeText={setCode} editable={!loading} autoFocus />
          </View>

          <Pressable onPress={handleResend} disabled={secondsLeft > 0 || loading} className="py-4">
            <Text className="text-center text-[13px] text-ink/55">
              {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : 'Resend code'}
            </Text>
          </Pressable>
          <PrimaryButton label="Verify code" onPress={handleVerify} loading={loading} disabled={code.length !== 6} tone="blue" />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

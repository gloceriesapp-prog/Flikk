// Phone-OTP login — shared auth mechanism across all 4 apps, see
// specs/00-foundation/auth-and-roles.md. This screen only requests the OTP;
// verification happens on the next screen.
//
// Layout fix (was cramped against the bottom edge on real devices before):
// footer sits in its own block with pb-safe + a fixed pb-4 floor, so there's
// always breathing room above the home indicator/gesture bar even on devices
// that report a 0 safe-area inset.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../api/auth';
import { ApiError } from '../api/client';
import { DismissKeyboardView } from '../components/DismissKeyboardView';
import { PhoneInput } from '../components/PhoneInput';
import { PrimaryButton } from '../components/PrimaryButton';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PHONE_LENGTH = 10;

export function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = phone.length === PHONE_LENGTH && !loading;

  async function handleContinue() {
    setError(null);
    setLoading(true);
    try {
      const fullPhone = `+91${phone}`;
      await requestOtp(fullPhone);
      navigation.navigate('OtpVerification', { phone: fullPhone });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        console.error('[LoginScreen] unexpected error requesting OTP:', err);
        setError('Could not send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    // Numeric-pad keyboards (PhoneInput below) don't push content up on
    // their own — without this, the keyboard just overlaps the Continue
    // button at the bottom of the screen instead of sitting above it.
    // 'padding' on iOS, 'height' on Android — the standard split, iOS's
    // own keyboard-avoidance model doesn't resize the view the way
    // Android's does.
    <DismissKeyboardView>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white pb-safe pt-safe">
        <View className="gap-5 px-6 pt-6">
          <Text className="text-2xl font-extrabold text-ink">Get Started</Text>
          <PhoneInput value={phone} onChangeText={setPhone} autoFocus />
          {error && <Text className="text-[13px] text-danger">{error}</Text>}
        </View>

        <View className="mt-auto gap-4 px-6 pb-4">
          <PrimaryButton label="Continue" onPress={handleContinue} disabled={!canContinue} loading={loading} />
          <Text className="text-center text-xs text-ink/60">
            By continuing, you agree to our{' '}
            <Text className="font-semibold opacity-100">Terms of Service</Text> and{' '}
            <Text className="font-semibold opacity-100">Privacy Policy</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

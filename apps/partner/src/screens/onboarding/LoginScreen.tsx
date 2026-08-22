// Phone-OTP login — shared auth mechanism across all 4 apps, see
// specs/00-foundation/auth-and-roles.md. This screen only requests the
// OTP; verification happens on the next screen. Same shape as
// apps/customer/src/screens/LoginScreen.tsx.

import { useState } from 'react';
import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { PhoneInput } from '../../components/PhoneInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/types';

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
      const { devMode } = await requestOtp(fullPhone);
      navigation.navigate('OtpVerification', { phone: fullPhone, devMode });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white pb-safe pt-safe">
      <View className="gap-5 px-6 pt-6">
        <Text className="text-2xl font-bold text-ink">Store owner login</Text>
        <PhoneInput value={phone} onChangeText={setPhone} autoFocus />
        {error && <Text className="text-[13px] font-medium text-danger">{error}</Text>}
      </View>

      <View className="mt-auto gap-4 px-6 pb-4">
        <PrimaryButton label="Continue" onPress={handleContinue} disabled={!canContinue} loading={loading} />
        <Text className="text-center text-xs font-medium text-ink/50">
          By continuing, you agree to our <Text className="font-semibold text-ink/70">Terms of Service</Text> and{' '}
          <Text className="font-semibold text-ink/70">Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

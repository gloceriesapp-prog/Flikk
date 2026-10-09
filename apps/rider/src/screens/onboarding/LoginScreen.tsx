import { useState } from 'react';
import { useOtpChallenge } from '@gloceries/shared';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Alert, Pressable, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { DismissKeyboardView } from '../../components/DismissKeyboardView';
import { PhoneInput } from '../../components/PhoneInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors } from '../../theme/tokens';
import { requestOtp } from '../../api/auth';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [digits, setDigits] = useState('');
  const { busy: loading, run } = useOtpChallenge(false);

  async function handleContinue() {
    if (!/^[6-9]\d{9}$/.test(digits)) return;
    await run(async (isCurrent) => {

      try {
        const phone = `+91${digits}`;
        await requestOtp(phone);
        if (!isCurrent()) return;
        navigation.navigate('OtpVerification', { phone });
      } catch (err) {
        if (!isCurrent()) return;
        Alert.alert('Could not send code', err instanceof Error ? err.message : 'Please try again.');
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

          <View className="mt-6 flex-1 gap-6">
            <View className="gap-2">
              <Text className="text-2xl font-semibold text-ink">What’s your number?</Text>
              <Text className="text-[15px] font-medium text-ink/55">We’ll send a 6-digit code to verify it’s really you.</Text>
            </View>

            <PhoneInput value={digits} onChangeText={setDigits} editable={!loading} autoFocus />
          </View>

          <PrimaryButton label="Verify" onPress={handleContinue} loading={loading} disabled={!/^[6-9]\d{9}$/.test(digits)} tone="blue" />
        </View>
      </KeyboardAvoidingView>
    </DismissKeyboardView>
  );
}

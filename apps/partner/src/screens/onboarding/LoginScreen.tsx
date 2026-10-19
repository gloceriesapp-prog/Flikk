import { AppImage as Image } from '../../components/AppImage';
// Phone-OTP login — shared auth mechanism across all 4 apps, see
// specs/00-foundation/auth-and-roles.md. This screen only requests the
// OTP; verification happens on the next screen.
//
// Keep the form reachable with the keyboard open, in landscape and in
// resized windows. The decorative image shrinks on short screens; the form scrolls.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { PhoneInput } from '../../components/PhoneInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PHONE_LENGTH = 10;
const HERO_IMAGE_URI = 'https://images.gloceries.com/appsui/patner-login.png';

export function LoginScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = width > height ? 112 : 240;
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
    <KeyboardAvoidingView
      // Re-measure keyboard avoidance after rotation/window resizing. RN's
      // height mode otherwise retains the previous window's initial height.
      key={width}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Image source={{ uri: HERO_IMAGE_URI }} style={{ width: '100%', height: heroHeight }} resizeMode="cover" />
        <View
          className="gap-5 bg-white px-6 pt-7"
          style={{
            flexGrow: 1,
            width: '100%',
            maxWidth: 640,
            alignSelf: 'center',
            paddingBottom: insets.bottom,
            paddingLeft: Math.max(24, insets.left),
            paddingRight: Math.max(24, insets.right),
          }}
        >
          <Text className="text-2xl font-semibold leading-8 text-ink">Run your store from your pocket.</Text>

          <PhoneInput value={phone} onChangeText={setPhone} autoFocus />
          {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}

          {/* Solid black CTA, not the blue variant — this app's own
              established CTA language (Catalog/Save changes/Accept Order)
              per PrimaryButton.tsx's own note, kept consistent here too. */}
          <View className="mt-auto gap-3 pb-6">
            <PrimaryButton label="Continue" onPress={handleContinue} disabled={!canContinue} loading={loading} />

            <Text className="text-center text-[11px] font-medium text-ink/35">Powered by gloceries.com</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

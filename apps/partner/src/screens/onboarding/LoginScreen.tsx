import { AppImage as Image } from '../../components/AppImage';
// Phone-OTP login — shared auth mechanism across all 4 apps, see
// specs/00-foundation/auth-and-roles.md. This screen only requests the
// OTP; verification happens on the next screen.
//
// Fixed hero image at top (store-image.jpeg, real storefront photo — a
// fitting image for a store-owner login, unlike customer's own generic
// hero), plain and static — no keyboard-driven shrink/extend animation.
// That animation only works on customer's own app because its
// app.config.js explicitly forces Android's softInputMode to 'pan' (no
// window resize, so nothing else makes room for the keyboard except that
// manual shrink); partner has no such override, so Android's default
// resize behavior already handles the keyboard on its own — a fixed image
// height plus a real KeyboardAvoidingView 'height' behavior on Android is
// the correct, much simpler fit here, not a copy of customer's own
// keyboard-controller-driven setup. That mismatch (Android getting
// `behavior={undefined}`, appropriate only under 'pan' mode) was the
// actual bug behind "the Continue button isn't visible" — nothing was
// avoiding the keyboard on Android at all.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../../api/auth';
import { ApiError } from '../../api/client';
import { PhoneInput } from '../../components/PhoneInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PHONE_LENGTH = 10;
const HERO_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/store-image.jpeg';
// Fixed, real height — not measured/animated. Full device width, this
// height; resizeMode="cover" keeps the real image's own aspect from
// looking stretched at that width without needing its actual pixel
// dimensions on hand.
const HERO_HEIGHT = 240;

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
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      <Image source={{ uri: HERO_IMAGE_URI }} style={{ width: '100%', height: HERO_HEIGHT }} resizeMode="cover" />

      {/* 'height' on Android, not undefined — this app has no softInputMode
          override (unlike customer's own 'pan' setup), so Android's real
          window-resize needs KeyboardAvoidingView to actually push content
          up. style={{flex:1}}, not className="flex-1" — KeyboardAvoidingView
          isn't one of NativeWind's auto-patched components (same gotcha
          this codebase already documents for Animated.View/LinearGradient
          elsewhere), so the className was being silently dropped, leaving
          this view with no real height at all — the actual reason the
          Continue button never rendered, keyboard open or not. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View className="flex-1 gap-5 bg-white px-6 pb-safe pt-7">
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
      </KeyboardAvoidingView>
    </View>
  );
}

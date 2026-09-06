// Phone-OTP login — shared auth mechanism across all 4 apps, see
// specs/00-foundation/auth-and-roles.md. This screen only requests the OTP;
// verification happens on the next screen.
//
// Redesigned again — back to a single full-bleed hero illustration up top
// (the product-tile grid from the previous pass is gone), with a Skip
// button floating over it, per an explicit ask matching a Zepto-style
// reference. HERO_IMAGE_URI is a placeholder (order-alert.png, the last
// real asset given) — the actual image requested was a Pinterest pin PAGE
// url, not a direct image file, which can't be used as an <Image> source;
// swap in the real i.pinimg.com/... link (Pinterest's own "copy image
// address") once that's available.
//
// Skip now really works — useAuthStore's own continueAsGuest() sets
// isGuest, which RootNavigator.tsx treats the same as a real accessToken
// for deciding whether to mount the app shell. Browsing is real; acting
// (checkout, anything requiring a real session) still isn't — every
// authenticated backend call still needs a real token, a guest just gets
// as far as the endpoint's own 401 same as before. ProfileScreen.tsx is
// the one screen that can't function at all without a real identity, so
// it shows its own "log in to continue" prompt for a guest instead of
// trying (and failing) to load real profile data.
//
// Sheet content redesigned again per a Zepto-style reference: the centered
// brand badge and "Log in or sign up" subtitle are both gone — just a
// left-aligned headline (one word in the brand's lime accent, same trick
// the reference uses with its own accent color on "minutes"), then the
// phone row (now PhoneInput.tsx's own merged-box-with-floating-label
// shape, see that file's own note), Continue, terms line below the
// button.

import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { AppImage as Image } from '../components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../api/auth';
import { ApiError } from '../api/client';
import { PhoneInput } from '../components/PhoneInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/useAuthStore';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PHONE_LENGTH = 10;
// Placeholder — see this file's own header note on why the actual
// requested Pinterest-pin URL can't be used directly.
const HERO_IMAGE_URI = 'https://bjlknohjdnemxwwoxcsv.supabase.co/storage/v1/object/public/Images/login-image.png';

export function LoginScreen({ navigation }: Props) {
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
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
    // No DismissKeyboardView here (was tap-outside-to-close) — per an
    // explicit ask, the keyboard must stay up on this screen: phone entry
    // is the whole point of it, so there's nothing gained by letting a
    // stray tap hide it and nothing lost by keeping it pinned open. Note:
    // this only removes the app's own tap-to-dismiss handler — Android's
    // hardware/gesture back button dismissing the keyboard is OS-level
    // behavior this app doesn't control and shouldn't try to override
    // (blocking a user's own back button is exactly the kind of trap this
    // repo's own safety guidance warns against).
    //
    // Numeric-pad keyboards (PhoneInput below) don't push content up on
    // their own — without this, the keyboard just overlaps the Continue
    // button at the bottom of the screen instead of sitting above it.
    // 'padding' on iOS, 'height' on Android — the standard split, iOS's
    // own keyboard-avoidance model doesn't resize the view the way
    // Android's does.
    <View className="flex-1 bg-white">
        {/* Dark icons — the actual hero photo's own top edge is light
            (near-white), not dark, so "light" (white icons) was reading
            as barely-visible white-on-white. Matching what the image
            genuinely looks like, not what an earlier placeholder used to.
            Wrapper bg switched from bg-ink to bg-white for the same
            reason — no dark flash behind a light image while it loads. */}
        <StatusBar style="dark" />

        {/* Single hero illustration, the only flex-1 in this column — it
            claims exactly whatever space the sheet below doesn't need
            (that sheet sizes to its own content, no competing flex-1 on
            it). */}
        <View className="flex-1">
          <Image source={{ uri: HERO_IMAGE_URI }} style={StyleSheet.absoluteFill} resizeMode="cover" />

          {/* Top scrim — a soft white wash right under the notch/status
              bar, dissolving to fully transparent by mid-fade so it reads
              as depth (the image gently receding behind the status row)
              rather than washing out the artwork. Kept deliberately light
              (peak 0.3 alpha, not the bottom mask's near-opaque White) —
              this one's pure polish, not solving a legibility problem
              (StatusBar's already dark-on-light and reads fine on its
              own). Same white-alpha-not-'transparent' rule as the bottom
              mask. */}
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
            locations={[0, 1]}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 90 }}
          />

          {/* Bottom fade mask — the image used to end in a hard cut line
              exactly where the white sheet starts, which read as two
              unrelated layers stacked rather than one composed screen.
              Fading the image's own bottom edge into white first lets it
              dissolve into the sheet instead of butting against it.
              White-alpha stops throughout, not the literal string
              'transparent' — LinearGradient parses that as rgba(0,0,0,0)
              (black, fully see-through), so a fade toward white would
              cross through a muddy gray/black midtone instead of a clean
              white dissolve (same fix BottomNavBar.tsx's own fade
              gradient already documents). */}
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.9)', '#FFFFFF']}
            locations={[0, 0.45, 0.75, 1]}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 }}
          />

          {/* Skip — floats over the image, top-right, matching the
              reference. Real now: continueAsGuest() flips RootNavigator
              over to the app shell without a session (see this file's
              own header note). */}
          <Pressable onPress={continueAsGuest} className="absolute right-5 top-safe-offset-4 rounded-full bg-gray-200 px-5 py-2.5">
            <Text className="text-[15px] font-medium text-black">Skip</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View className="gap-5 bg-white px-6 pb-6 pt-7">
            {/* Left-aligned headline — no lime accent word anymore, per an
                explicit ask to drop green from this screen entirely; the
                whole line is just bold black now. */}
            <Text className="text-2xl font-semibold leading-8 text-ink">Groceries to gadgets, done.</Text>

            <PhoneInput value={phone} onChangeText={setPhone} autoFocus />
            {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}

            <PrimaryButton label="Continue" onPress={handleContinue} disabled={!canContinue} loading={loading} variant="blue" />

            {/* Terms line BELOW the button — this wireframe's own order,
                flipped from an earlier pass that had it above. */}
            <Text className="text-center text-xs text-ink/60">
              By continuing, you agree to our{' '}
              <Text className="font-semibold opacity-100">Terms of Service</Text> and{' '}
              <Text className="font-semibold opacity-100">Privacy Policy</Text>
            </Text>
          </View>
          <View className="bg-white pb-safe" />
        </KeyboardAvoidingView>
      </View>
  );
}

// Phone-OTP login — shared auth mechanism across all 4 apps, see
// specs/00-foundation/auth-and-roles.md. This screen only requests the OTP;
// verification happens on the next screen.
//
// Redesigned: a fixed-size hero image pinned to the top (fixed height, full
// width, cover — no stretch, no measure-and-shrink animation), a Skip button
// floating over it, then the sheet below (headline, phone row, Continue,
// terms). HERO_IMAGE_URI points at the real customer-update.png asset.
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
import { Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { AppImage as Image } from '../components/AppImage';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp } from '../api/auth';
import { ApiError } from '../api/client';
import { PhoneInput } from '../components/PhoneInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/useAuthStore';
import type { AuthStackParamList } from '../navigation/types';
import { useAppConfig } from '../api/appConfig';
import { openLink } from '../utils/openLink';
import { storageUrl } from '../utils/storageUrl';

// Inline legal link: underlined + tappable only when admin has set a URL,
// plain text otherwise (no dead-looking link).
function LegalLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return <Text className="font-medium text-ink/75">{label}</Text>;
  return (
    <Text accessibilityRole="link" accessibilityLabel={`Open ${label}`} onPress={() => openLink(url)} suppressHighlighting className="font-semibold text-ink underline">
      {label}
    </Text>
  );
}

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const PHONE_LENGTH = 10;
// Hero pinned to the top at the image's OWN proportions: full device width,
// height derived from the image's real width/height (aspectRatio), so it's
// shown exactly as authored — no stretch, no crop. The real ratio comes from
// expo-image's onLoad; HERO_FALLBACK_RATIO just reserves a sensible box for
// the split-second before the image reports its size (avoids a layout jump).
const HERO_IMAGE_URI = storageUrl('app-images/app-cust.png');
const HERO_FALLBACK_RATIO = 1; // width:height, replaced once the image loads

export function LoginScreen({ navigation }: Props) {
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const { legal } = useAppConfig();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The image's true width:height, learned from expo-image's onLoad. Drives
  // the hero box height so it renders at the image's own proportions.
  const [heroRatio, setHeroRatio] = useState<number | null>(null);

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
    // Android runs 'pan' mode (app.config.js's own note) so the OS never
    // resizes the window when the keyboard opens — which also means
    // nothing shrinks the hero automatically the way iOS's 'padding'
    // behavior does. heroAnimatedStyle above does that shrink manually,
    // driven by the real keyboard height, so the sheet below has room to
    // sit fully above the keyboard without needing its own
    // KeyboardAvoidingView translate on top of it (that was tried and
    // either overshot — 'position' on the whole screen — or did nothing —
    // 'height' with no resize signal to react to).
    <View className="flex-1 bg-white">
      {/* Dark icons — the hero's top edge is light, so white icons would
            vanish. */}
      <StatusBar style="dark" />

      {/* Hero pinned to the top, rendered at the image's OWN proportions:
            full width, height = width ÷ (image ratio). resizeMode "contain" so
            the whole image shows with no stretch and no crop. */}
      <View className="w-full overflow-hidden">
        <Image
          source={{ uri: HERO_IMAGE_URI }}
          onLoad={(e) => {
            const { width, height } = e.source;
            if (width > 0 && height > 0) setHeroRatio(width / height);
          }}
          style={{ width: '100%', aspectRatio: heroRatio ?? HERO_FALLBACK_RATIO }}
          resizeMode="contain"
        />

        {/* Skip — floats over the image, top-right. continueAsGuest() flips
              RootNavigator to the app shell without a session. */}
        <Pressable onPress={continueAsGuest} accessibilityRole="button" accessibilityLabel="Skip login and browse as guest" className="absolute right-5 top-safe-offset-4 rounded-full bg-[#FFFFFF] px-5 py-2.5">
          <Text className="text-[15px] font-medium text-black">Skip</Text>
        </Pressable>
      </View>

      {/* Android gets no behavior (pan mode pans to the focused field on its
            own); iOS pads for the keyboard. flex-1 so the white sheet fills all
            remaining height below the hero — no content-hugging card, the whole
            lower screen is solid white. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* White sheet lifts UP over the hero's bottom edge (-mt) with big
              rounded top corners + a soft upward shadow, so the image reads as
              tucked behind a card rather than butting into a flat panel. flex-1
              stretches it to the bottom of the screen; pb-safe keeps content
              clear of the home indicator. Later sibling than the hero, so it
              draws on top of it. */}
        <View
          className="-mt-8 flex-1 gap-5 rounded-t-[34px] bg-white px-6 pb-safe-offset-6 pt-6"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            elevation: 16,
          }}
        >
          {/* Grab handle — pure polish, signals a sheet. */}
          <View className="mb-1 h-1.5 w-12 self-center rounded-full bg-gray-200" />

          {/* Left-aligned headline — no lime accent word anymore, per an
                explicit ask to drop green from this screen entirely; the
                whole line is just bold black now. */}
          <Text className="text-[26px] font-semibold leading-8 text-ink">From local shops, to you</Text>

          {/* Subtitle right under the title, above the phone field — one
                field serves both cases (new number signs up, known number logs
                in), so "Log in or sign up" is honest, not two separate flows. */}
          <Text className="-mt-4 text-[15px] font-medium text-ink/50">Log in or sign up</Text>

          <PhoneInput value={phone} onChangeText={setPhone} autoFocus />
          {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}

          <PrimaryButton label="Continue" onPress={handleContinue} disabled={!canContinue} loading={loading} variant="blue" />

          {/* Terms line BELOW the button — this wireframe's own order,
                flipped from an earlier pass that had it above. */}
          <Text className="text-center text-[11px] leading-5 text-ink/45 font-medium">
            By continuing, you acknowledge our{' '}
            <LegalLink label="Terms" url={legal.termsUrl} />{' '}
            and{' '}
            <LegalLink label="Privacy Policy" url={legal.privacyUrl} />
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Verifies the code sent by LoginScreen, then persists the session and hands
// off to the app shell. See specs/00-foundation/auth-and-roles.md for the flow.
//
// Redesigned to match LoginScreen.tsx's own visual language exactly — same
// hero image + top scrim + bottom fade-to-white mask, same flush (no
// rounded-card) white sheet, same no-green rule (OtpBoxInput.tsx's active
// box border is now black, not lime). Back button floats over the image
// (top-left) instead of sitting inline above the title, mirroring where
// Login's own Skip button sits (top-right) on the same image. Title
// changed from the plain "OTP Verification" label to "Verify your
// number" — reads as a step in one continuous flow with Login's own
// headline, not a separate, colder system screen.

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Platform, Pressable, Text, View } from 'react-native';
import { KeyboardAvoidingView, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { AppImage as Image } from '../components/AppImage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestOtp, verifyOtp } from '../api/auth';
import { ApiError } from '../api/client';
import { AppIcon } from '../components/AppIcon';
import { OtpBoxInput } from '../components/OtpBoxInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme/tokens';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'OtpVerification'>;

const RESEND_COOLDOWN_SECONDS = 30;
// Same placeholder asset LoginScreen.tsx uses — see that file's own note
// on the real requested image being a Pinterest pin PAGE url, not usable
// directly as an <Image> source.
const HERO_IMAGE_URI = 'https://i.pinimg.com/1200x/53/0f/0f/530f0f3dd202c67cc866513e91058475.jpg';

export function OtpVerificationScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const setSession = useAuthStore((s) => s.setSession);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Same fix as LoginScreen.tsx's own identical hero+keyboard setup —
  // Android runs 'pan' mode (app.config.js) so the OS never resizes the
  // window when the keyboard opens; this manually shrinks the hero by the
  // real keyboard height instead, since 'height' behavior gets no resize
  // signal to react to under 'pan'. See LoginScreen.tsx's own note for the
  // full reasoning (KeyboardAvoidingView's 'height'/'position' on the
  // whole screen were both tried and failed before landing on this).
  const [heroSize, setHeroSize] = useState({ width: 0, height: 0 });
  const measuredHero = useRef(false);
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    height: heroSize.height > 0 ? Math.max(heroSize.height - Math.abs(keyboardHeight.value), 80) : undefined,
  }));

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
        const { access_token, refresh_token } = await verifyOtp(phone, otp);
        await setSession(access_token, refresh_token);
        // RootNavigator swaps to the app shell automatically once accessToken is set
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
        setCode('');
      } finally {
        setLoading(false);
      }
    },
    [phone, setSession],
  );

  // auto-submit once all 6 digits are entered — one less tap for the user.
  // Triggered from the input's own change handler, not an effect watching
  // `code`, so this isn't a setState-in-effect cascade.
  function handleCodeChange(digits: string) {
    setCode(digits);
    if (digits.length === 6) handleVerify(digits);
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
      {/* Same reasoning as LoginScreen.tsx's own note: the hero photo's
          top edge is light, dark icons are what actually reads against
          it. */}
      <StatusBar style="dark" />

      {/* Inline style, not className, for flex:1 here — Animated.View isn't
          NativeWind-patched the same way a bare View is (LoginScreen.tsx's
          own identical note). Explicit numeric width/height on the Image
          (not StyleSheet.absoluteFill) works around expo-image's Android
          "cover" sizing quirk, also documented there. */}
      <Animated.View
        style={[{ flex: heroSize.height === 0 ? 1 : undefined, overflow: 'hidden' }, heroSize.height > 0 && heroAnimatedStyle]}
        onLayout={(e) => {
          if (measuredHero.current) return;
          measuredHero.current = true;
          setHeroSize(e.nativeEvent.layout);
        }}
      >
        {heroSize.width > 0 && (
          <Image
            source={{ uri: HERO_IMAGE_URI }}
            style={{ position: 'absolute', top: 0, left: 0, width: heroSize.width, height: heroSize.height }}
            resizeMode="cover"
          />
        )}

        <LinearGradient
          colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']}
          locations={[0, 1]}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 90 }}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.9)', '#FFFFFF']}
          locations={[0, 0.45, 0.75, 1]}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 }}
        />

        {/* Back — floats top-left over the image, same treatment as
            Login's own Skip button (top-right) on this identical photo. */}
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          className="absolute left-5 top-safe-offset-4 h-11 w-11 items-center justify-center rounded-full bg-white"
        >
          <AppIcon icon={ArrowLeft01Icon} size={20} color={colors.ink} />
        </Pressable>
      </Animated.View>

      {/* Android gets no behavior here (undefined = no-op) — the hero's
          own shrink animation above already makes room for the keyboard;
          LoginScreen.tsx's own identical note explains why adding
          'position' on top would overshoot and 'height' does nothing
          under this app's 'pan' softwareKeyboardLayoutMode. */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="gap-5 bg-white px-6 pb-safe-offset-6 pt-7">
          <View className="gap-1.5">
            <Text className="text-2xl font-semibold leading-8 text-ink">Verify your number.</Text>
            <Text className="text-sm text-ink/55">
              Code sent to <Text className="font-semibold text-ink">{phone}</Text>
            </Text>
          </View>

          <OtpBoxInput value={code} onChangeText={handleCodeChange} autoFocus />
          {error && <Text className="text-center text-[13px] text-danger">{error}</Text>}

          <Pressable onPress={handleResend} disabled={secondsLeft > 0}>
            <Text className="text-center text-[13px] text-ink/55">
              {secondsLeft > 0
                ? `Didn't receive the code? Retry in 00:${String(secondsLeft).padStart(2, '0')}`
                : "Didn't receive the code? Resend"}
            </Text>
          </Pressable>

          {/* Always visible now, not just once loading — this used to be
              auto-submit-only (fires the instant the 6th digit is typed),
              which is fine for anyone who fills all 6 boxes, but left no
              visible next step for someone who pastes a code, or just
              expects a button to press like every other form. Disabled
              until 6 digits are in; pressing it while auto-submit has
              already fired is harmless (handleVerify's own setLoading
              guards against a second request). */}
          <PrimaryButton
            label={loading ? 'Verifying…' : 'Continue'}
            onPress={() => handleVerify(code)}
            disabled={code.length !== 6 || loading}
            loading={loading}
            variant="blue"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Root screen — brand entry before the auth flow. Blinkit-style: logo, tagline,
// single CTA, nothing else to learn before the user's first action. Corresponds
// to PRD screen C1 (Splash), expanded with the actual onboarding content rather
// than a bare loading spinner.
//
// Full-bleed blue gradient background, not flat lime-on-mist — per an
// explicit ask to try both and pick the better one: a flat single-color
// splash reads cheap/static, a diagonal deep-navy-to-brand-blue gradient
// reads like it has actual depth/light to it, same "premium" call this
// app's other screens have leaned toward. Blue, not lime, on purpose —
// matches the same #2457F5 this app's auth-flow buttons already use
// (PrimaryButton's own "blue" variant, LoginScreen/OtpVerificationScreen),
// so this splash sets up that color rather than introducing a third brand
// tone. Badge/wordmark/tagline all flip to white-on-blue accordingly —
// lime-on-mist wouldn't read against this background at all.
//
// Button is its own one-off here (not PrimaryButton) — white pill,
// blue label, a trailing arrow for a bit of directional "let's go"
// motion, since this is the one screen in the whole auth flow that's
// pure brand moment with nothing functional competing with it.
//
// pt-safe/pb-safe (NativeWind) resolve to the device's real notch/home-indicator
// insets via SafeAreaProvider in App.tsx — not a fixed guess, so this holds up
// across notch, punch-hole, and home-button devices alike.

import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../components/AppIcon';
import { useAuthStore } from '../store/useAuthStore';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const BLUE = '#2457F5';

export function OnboardingScreen({ navigation }: Props) {
  const markOnboardingSeen = useAuthStore((s) => s.markOnboardingSeen);

  return (
    <LinearGradient
      colors={['#0B1440', '#12237A', BLUE]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar style="light" />
      <View className="flex-1 justify-between px-6 pb-safe pt-safe">
        <View className="flex-1 items-center justify-center">
          <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-2xl bg-white shadow-lg shadow-black/30">
            <Text className="text-3xl font-extrabold" style={{ color: BLUE }}>
              F
            </Text>
          </View>
          <Text className="text-[28px] font-extrabold tracking-tight text-white">Flikk</Text>
          <Text className="mt-2 text-[15px] text-white/70">Your local store, delivered fast.</Text>
        </View>

        <View className="gap-3 pb-4">
          <Pressable
            onPress={() => {
              markOnboardingSeen();
              navigation.navigate('Login');
            }}
            className="h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-white shadow-lg shadow-black/30 active:opacity-90"
          >
            <Text className="text-base font-semibold" style={{ color: BLUE }}>
              Get Started
            </Text>
            <AppIcon icon={ArrowRight02Icon} size={18} color={BLUE} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

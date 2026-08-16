// Root screen — brand entry before the auth flow. Blinkit-style: logo, tagline,
// single CTA, nothing else to learn before the user's first action. Corresponds
// to PRD screen C1 (Splash), expanded with the actual onboarding content rather
// than a bare loading spinner.
//
// pt-safe/pb-safe (NativeWind) resolve to the device's real notch/home-indicator
// insets via SafeAreaProvider in App.tsx — not a fixed guess, so this holds up
// across notch, punch-hole, and home-button devices alike.

import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../components/PrimaryButton';
import type { AuthStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export function OnboardingScreen({ navigation }: Props) {
  return (
    <View className="flex-1 justify-between bg-mist px-6 pb-safe pt-safe">
      <View className="flex-1 items-center justify-center">
        {/* ink-on-lime, not white-on-lime — lime fails AA contrast with white text,
            see specs/00-foundation/design-system.md's contrast note */}
        <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-2xl bg-lime">
          <Text className="text-3xl font-extrabold text-ink">F</Text>
        </View>
        <Text className="text-[28px] font-extrabold tracking-tight text-ink">Flikk</Text>
        <Text className="mt-2 text-[15px] text-ink/65">Your local store, delivered fast.</Text>
      </View>

      <View className="gap-3 pb-4">
        <PrimaryButton label="Get Started" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  );
}

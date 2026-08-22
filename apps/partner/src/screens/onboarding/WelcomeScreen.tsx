// Root screen — brand entry before the auth flow. Same shape as
// apps/customer/src/screens/OnboardingScreen.tsx, copy aimed at a store
// owner instead of a shopper. pt-safe/pb-safe (NativeWind) resolve to the
// device's real notch/home-indicator insets via SafeAreaProvider in
// App.tsx — holds up across notch, punch-hole, and home-button devices.

import { Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View className="flex-1 justify-between bg-white px-6 pb-safe pt-safe">
      <View className="flex-1 items-center justify-center">
        {/* ink-on-lime, not white-on-lime — lime fails AA contrast with
            white text, see specs/00-foundation/design-system.md. */}
        <View className="mb-4 h-[72px] w-[72px] items-center justify-center rounded-2xl bg-lime">
          <Text className="text-3xl font-bold text-ink">F</Text>
        </View>
        <Text className="text-[28px] font-bold tracking-tight text-ink">Flikk Partner</Text>
        <Text className="mt-2 text-center text-[15px] font-medium text-ink/60">
          Manage orders, catalog, and payouts for your store.
        </Text>
      </View>

      <View className="gap-3 pb-4">
        <PrimaryButton label="Get Started" onPress={() => navigation.navigate('Login')} />
      </View>
    </View>
  );
}

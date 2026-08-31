// Brand entry screen — first thing a rider sees, before Login. Same shape
// as the other two apps' own Welcome screens: a mark, a short line on
// what this app is for, one CTA into the phone-entry flow.

import { ArrowRight01Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <View className="flex-1 justify-between bg-ink px-6 pb-safe-offset-6 pt-safe-offset-10">
      <View className="flex-1 items-center justify-center gap-5">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-lime">
          <AppIcon icon={DeliveryTruck01Icon} size={34} color={colors.ink} strokeWidth={2} />
        </View>
        <View className="items-center gap-2">
          <Text className="text-3xl font-bold text-white">Flikk Rider</Text>
          <Text className="max-w-[260px] text-center text-[15px] leading-5 text-white/60">
            Real orders from real local stores in Kaup — pick up, deliver, get paid.
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => navigation.navigate('Login')}
        className="h-[52px] flex-row items-center justify-center gap-1.5 rounded-full bg-lime"
      >
        <Text className="text-base font-semibold text-ink">Get started</Text>
        <AppIcon icon={ArrowRight01Icon} size={16} color={colors.ink} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

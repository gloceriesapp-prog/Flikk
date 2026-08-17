// "Purchase" tab (was "Order Again" in the bottom nav). Reached from
// BottomNavBar — see src/components/BottomNavBar/data.ts.

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Purchase'>;

const FEATURE_IMAGE_URI = 'https://i.pinimg.com/1200x/a1/dc/37/a1dc376c96e834e7ae7baf401202b79a.jpg';

export function PurchaseScreen({ navigation }: Props) {
  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center gap-3 px-5 pb-1 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="text-xl font-extrabold text-ink">Purchase</Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="flex-grow justify-between pb-16" showsVerticalScrollIndicator={false}>
        <View>
          <Image source={{ uri: FEATURE_IMAGE_URI }} className="aspect-[4/5] w-3/5 self-center" resizeMode="cover" />
          <Text className="mt-5 px-8 text-center text-lg font-bold text-ink">No orders yet.</Text>
          <Text className="mt-1 px-8 text-center text-sm font-medium text-ink/50">
            They&apos;ll show up here once you place your first one.
          </Text>
        </View>

        <Text className="px-6 text-left text-[25px] font-semibold leading-8 text-gray-500">
          You&apos;re not just ordering. You&apos;re keeping local shops open. 🌾
        </Text>
      </ScrollView>
    </View>
  );
}

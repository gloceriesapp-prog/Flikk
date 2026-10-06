import { Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import type { AppStackParamList } from '../../navigation/types';

export function AboutGloceriesScreen({ navigation }: NativeStackScreenProps<AppStackParamList, 'AboutGloceries'>) {
  return (
    <View className="flex-1 bg-white pt-safe">
      <StatusBar style="dark" />
      <View className="flex-row items-center px-5 py-4">
        <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" className="p-2">
          <AppIcon icon={ArrowLeft01Icon} size={22} color="#101C10" />
        </Pressable>
        <Text className="flex-1 text-center text-lg font-semibold text-ink">About Gloceries</Text>
        <View className="w-9" />
      </View>
      <ScrollView contentContainerClassName="gap-5 px-6 pb-safe-offset-8 pt-6">
        <Text className="text-3xl font-bold text-ink">Your neighbourhood, closer.</Text>
        <Text className="text-base leading-7 text-ink/70">Gloceries brings everyday shopping from nearby stores to your phone. Discover groceries, fresh produce, regional favourites and festival essentials in one place, with availability based on your delivery location.</Text>
        <Text className="text-base leading-7 text-ink/70">Browse products and pack sizes, compare prices and choose the supplies that suit your home. Your cart shows a clear bill before you order, and purchase history keeps your orders together for easy reference.</Text>
        <Text className="text-base leading-7 text-ink/70">We connect customers with local shops and delivery partners, helping you follow your order from preparation to delivery. When you need a hand, order-linked support makes it easier to get help with your purchase.</Text>
      </ScrollView>
    </View>
  );
}

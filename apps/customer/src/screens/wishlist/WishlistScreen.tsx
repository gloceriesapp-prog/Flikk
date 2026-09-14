// Reached from HomeHeader's heart icon. Shows every product a customer has
// hearted (useWishlistStore, real account-backed sync via GET /wishlist —
// see that store's own note). Same 3-column ProductCard grid
// ProductSection.tsx already uses elsewhere, reused as-is rather than a new
// grid layout invented for this one screen.

import { HeartIcon } from '@hugeicons/core-free-icons';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppIcon } from '../../components/AppIcon';
import { colors } from '../../theme/tokens';
import { useWishlistStore } from '../../store/useWishlistStore';
import { ProductCard } from '../home/products/ProductCard';
import type { AppStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'Wishlist'>;

const CARD_WIDTH = 'w-[32%]';

export function WishlistScreen({ navigation }: Props) {
  const items = useWishlistStore((state) => state.items);

  return (
    <View className="flex-1 bg-white pt-safe">
      <View className="flex-row items-center px-2 pb-2 pt-2">
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} className="h-11 w-11 items-center justify-center">
          <AppIcon icon={ArrowLeft01Icon} size={22} color={colors.ink} />
        </Pressable>
        <Text className="flex-1 text-center text-xl font-bold text-ink">Wishlist</Text>
        <View className="h-11 w-11" />
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 px-10">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#F5F5F5]">
            <AppIcon icon={HeartIcon} size={26} color={colors.ink} strokeWidth={1.6} />
          </View>
          <Text className="text-center text-base font-semibold text-ink">Nothing here yet</Text>
          <Text className="text-center text-sm text-ink/50">
            Tap the heart on any product to save it here for later.
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10 pt-2">
          <View className="flex-row flex-wrap gap-x-2.5 gap-y-5">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} widthClassName={CARD_WIDTH} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
